import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from './auth';

const FIRESTORE_SYNC_TIMEOUT_MS = 15000;
const AUTO_BACKUP_RETENTION = 10;

type CloudSyncErrorCode =
  | 'not-authenticated'
  | 'timeout'
  | 'permission-denied'
  | 'unavailable'
  | 'unknown';

export class CloudSyncError extends Error {
  code: CloudSyncErrorCode;

  constructor(code: CloudSyncErrorCode, message: string) {
    super(message);
    this.name = 'CloudSyncError';
    this.code = code;
  }
}

const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new CloudSyncError('not-authenticated', '로그인이 만료되었습니다. 다시 로그인해 주세요.');
  }

  return user;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMessage: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new CloudSyncError('timeout', timeoutMessage));
        }, FIRESTORE_SYNC_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const normalizeCloudSyncError = (error: unknown, fallbackMessage: string): CloudSyncError => {
  if (error instanceof CloudSyncError) {
    return error;
  }

  const firebaseError = error as { code?: string; message?: string };

  switch (firebaseError?.code) {
    case 'permission-denied':
      return new CloudSyncError('permission-denied', 'Firestore 접근 권한이 없습니다. 보안 규칙을 확인해 주세요.');
    case 'unavailable':
      return new CloudSyncError('unavailable', '네트워크 또는 Firestore 서버 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.');
    default:
      return new CloudSyncError('unknown', firebaseError?.message || fallbackMessage);
  }
};

export const getCloudSyncErrorMessage = (error: unknown): string => {
  return normalizeCloudSyncError(error, '클라우드 동기화 중 알 수 없는 오류가 발생했습니다.').message;
};

export interface CloudBackupSnapshot {
  id: string;
  createdAt: string | null;
  source: 'manual' | 'auto';
}

const getUserDocRef = (uid: string) => doc(db, 'users', uid);
const getSnapshotsCollectionRef = (uid: string) => collection(db, 'users', uid, 'snapshots');

const makeSnapshotId = (source: 'manual' | 'auto') => `${source}-${Date.now()}`;

const createSnapshot = async (uid: string, data: any, source: 'manual' | 'auto') => {
  const snapshotRef = doc(getSnapshotsCollectionRef(uid), makeSnapshotId(source));
  await setDoc(snapshotRef, {
    appData: data,
    source,
    createdAt: serverTimestamp(),
  });
};

const pruneAutoSnapshots = async (uid: string) => {
  const snapshotsRef = getSnapshotsCollectionRef(uid);
  const snapshotQuery = query(snapshotsRef, orderBy('createdAt', 'desc'), limit(AUTO_BACKUP_RETENTION + 5));
  const snapshotDocs = await getDocs(snapshotQuery);
  const autoDocs = snapshotDocs.docs.filter((snapshotDoc) => snapshotDoc.data().source === 'auto');

  if (autoDocs.length <= AUTO_BACKUP_RETENTION) {
    return;
  }

  const batch = writeBatch(db);
  autoDocs.slice(AUTO_BACKUP_RETENTION).forEach((snapshotDoc) => {
    batch.delete(snapshotDoc.ref);
  });
  await batch.commit();
};

export const getCloudBackupSnapshots = async (): Promise<CloudBackupSnapshot[]> => {
  const user = getCurrentUser();

  try {
    const snapshotQuery = query(getSnapshotsCollectionRef(user.uid), orderBy('createdAt', 'desc'), limit(20));
    const snapshotDocs = await withTimeout(
      getDocs(snapshotQuery),
      '백업 목록을 불러오는 중 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.'
    );

    return snapshotDocs.docs.map((snapshotDoc) => {
      const data = snapshotDoc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;

      return {
        id: snapshotDoc.id,
        createdAt,
        source: data.source === 'manual' ? 'manual' : 'auto',
      } satisfies CloudBackupSnapshot;
    });
  } catch (error) {
    console.error('Cloud backup snapshot list failed:', error);
    throw normalizeCloudSyncError(error, '백업 목록을 불러오지 못했습니다.');
  }
};

export const restoreCloudBackupSnapshot = async (snapshotId: string): Promise<any> => {
  const user = getCurrentUser();

  try {
    const snapshotRef = doc(getSnapshotsCollectionRef(user.uid), snapshotId);
    const snapshotDoc = await withTimeout(
      getDoc(snapshotRef),
      '백업 스냅샷을 불러오는 중 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.'
    );

    if (!snapshotDoc.exists()) {
      throw new CloudSyncError('unknown', '선택한 백업을 찾을 수 없습니다.');
    }

    return snapshotDoc.data().appData || null;
  } catch (error) {
    console.error('Cloud backup snapshot restore failed:', error);
    throw normalizeCloudSyncError(error, '백업 스냅샷을 복원하지 못했습니다.');
  }
};

export const deleteCloudBackupSnapshot = async (snapshotId: string): Promise<void> => {
  const user = getCurrentUser();

  try {
    const snapshotRef = doc(getSnapshotsCollectionRef(user.uid), snapshotId);
    await withTimeout(
      deleteDoc(snapshotRef),
      '백업 스냅샷을 삭제하는 중 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.'
    );
  } catch (error) {
    console.error('Cloud backup snapshot delete failed:', error);
    throw normalizeCloudSyncError(error, '백업 스냅샷을 삭제하지 못했습니다.');
  }
};

export const syncDataToCloud = async (data: any, source: 'manual' | 'auto' = 'manual'): Promise<void> => {
  const user = getCurrentUser();

  try {
    const docRef = getUserDocRef(user.uid);
    await withTimeout(
      setDoc(
        docRef,
        {
          appData: data,
          updatedAt: serverTimestamp(),
          device: 'android-app',
          lastBackupSource: source,
        },
        { merge: true }
      ),
      'Firebase 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
    );

    await withTimeout(
      createSnapshot(user.uid, data, source),
      '백업 기록을 저장하는 중 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.'
    );

    if (source === 'auto') {
      await withTimeout(
        pruneAutoSnapshots(user.uid),
        '자동 백업 정리 중 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.'
      );
    }
  } catch (error) {
    console.error('Cloud sync out failed:', error);
    throw normalizeCloudSyncError(error, '클라우드 백업에 실패했습니다.');
  }
};

export const syncDataFromCloud = async (): Promise<any | null> => {
  const user = getCurrentUser();

  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await withTimeout(
      getDoc(docRef),
      'Firebase 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
    );

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.appData || null;
    }
  } catch (error) {
    console.error('Cloud sync in failed', error);
    throw normalizeCloudSyncError(error, '클라우드 데이터를 불러오지 못했습니다.');
  }

  return null;
};