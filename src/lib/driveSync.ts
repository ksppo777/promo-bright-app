import { getAccessToken } from './auth';
import { appLog } from './logger';

const FILE_NAME = 'BrightStudyData.json';

const getDriveFileId = async (token: string): Promise<string | null> => {
  try {
    const q = encodeURIComponent(`name='${FILE_NAME}'`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      appLog('ERROR', 'getDriveFileId failed', await res.text());
      return null;
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) return data.files[0].id;
    return null;
  } catch (err: any) {
    appLog('ERROR', 'getDriveFileId error', err.message);
    return null;
  }
};

export const syncToDrive = async (appData: any, localTimestamp: number) => {
  appLog('INFO', 'syncToDrive started', { localTimestamp });
  const token = await getAccessToken();
  if (!token) {
    appLog('ERROR', 'syncToDrive: Not logged in');
    throw new Error('Not logged in');
  }

  const fileId = await getDriveFileId(token);
  
  let targetFileId = fileId;

  if (!targetFileId) {
    // 1. Create file metadata
    const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
    });
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      appLog('ERROR', 'Drive create metadata failed', errText);
      throw new Error('Drive create metadata failed');
    }
    const meta = await metaRes.json();
    targetFileId = meta.id;
  }

  const payload = {
    timestamp: localTimestamp,
    data: appData
  };
  
  try {
    // 2. Upload file content
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      appLog('ERROR', 'Drive upload content failed', errText);
      throw new Error('Drive upload content failed');
    }
    appLog('SUCCESS', 'syncToDrive completed');
  } catch (err: any) {
    appLog('ERROR', 'syncToDrive fetch error', err.message);
    throw err;
  }
};

export const syncFromDrive = async (): Promise<{ data: any, timestamp: number } | null> => {
  appLog('INFO', 'syncFromDrive started');
  const token = await getAccessToken();
  if (!token) {
    appLog('ERROR', 'syncFromDrive: Not logged in');
    throw new Error('Not logged in');
  }

  const fileId = await getDriveFileId(token);
  if (!fileId) {
    appLog('INFO', 'syncFromDrive: No file found');
    return null;
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      appLog('ERROR', 'Drive download failed', errText);
      throw new Error('Drive download failed');
    }
    const data = await res.json();
    appLog('SUCCESS', 'syncFromDrive completed', { remoteTimestamp: data.timestamp });
    return data;
  } catch (err: any) {
    appLog('ERROR', 'syncFromDrive fetch error', err.message);
    throw err;
  }
};

export const autoSyncDrive = async (localData: any, localTimestamp: number, onUpdateLocal: (data: any, newTimestamp: number) => void) => {
  appLog('INFO', 'autoSyncDrive triggered', { localTimestamp });
  const token = await getAccessToken();
  if (!token || !navigator.onLine) {
    appLog('INFO', 'autoSyncDrive aborted', { hasToken: !!token, isOnline: navigator.onLine });
    return; // Silent skip
  }
  
  try {
     const remote = await syncFromDrive();
     if (remote && remote.timestamp > localTimestamp) {
       appLog('INFO', 'autoSyncDrive: remote is newer, updating local data');
       onUpdateLocal(remote.data, remote.timestamp);
     } else if (!remote || localTimestamp > (remote?.timestamp || 0)) {
       appLog('INFO', 'autoSyncDrive: local is newer or no remote, updating remote data');
       await syncToDrive(localData, localTimestamp);
     } else {
       appLog('INFO', 'autoSyncDrive: sync is up to date');
     }
  } catch (e: any) {
     appLog('ERROR', 'autoSyncDrive error', e.message);
     console.error('Auto sync error', e);
  }
};

