import { getAccessToken } from './auth';

const DROP_FILE_NAME = 'BrightStudy_Backup.json';

// Helper function to find the backup file if we created one before
const findBackupFileId = async (accessToken: string): Promise<string | null> => {
  try {
    const q = encodeURIComponent(`name='${DROP_FILE_NAME}' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      console.error('Failed to list files', await res.text());
      return null;
    }
    
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error('Error finding backup file in Drive:', err);
    return null;
  }
};

export const syncDataToDrive = async (appData: any): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please login again.');

  const fileContent = JSON.stringify(appData, null, 2);
  const metadata = {
    name: DROP_FILE_NAME,
    mimeType: 'application/json',
  };

  const fileId = await findBackupFileId(token);

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (fileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload to Google Drive: ${err}`);
  }
};

export const syncDataFromDrive = async (): Promise<any | null> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please login again.');

  const fileId = await findBackupFileId(token);
  if (!fileId) {
    throw new Error('Google Drive에 저장된 백업 파일이 없습니다.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to download from Google Drive: ${err}`);
  }

  return await res.json();
};
