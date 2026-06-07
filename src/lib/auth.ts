import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User, accessToken: string } | null> => {
  try {
    isSigningIn = true;

    if (Capacitor.isNativePlatform()) {
      const nativeResult = await FirebaseAuthentication.signInWithGoogle();

      if (!nativeResult.credential?.idToken) {
        throw new Error('Failed to get ID token from native Google Sign-In');
      }

      const credential = GoogleAuthProvider.credential(
        nativeResult.credential.idToken,
        nativeResult.credential.accessToken
      );
      const result = await signInWithCredential(auth, credential);
      
      cachedAccessToken = nativeResult.credential.accessToken || null;

      if (onAuthSuccessCallback) onAuthSuccessCallback(result.user, cachedAccessToken!);
      return { user: result.user, accessToken: cachedAccessToken! };
    } 
    else {
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth');
      }
      cachedAccessToken = credential.accessToken;
      
      if (onAuthSuccessCallback) onAuthSuccessCallback(result.user, cachedAccessToken);
      return { user: result.user, accessToken: cachedAccessToken };
    }
  } catch (error: any) {
    if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
      console.error('Sign in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

let onAuthSuccessCallback: ((user: User, token: string) => void) | null = null;
export const setOnAuthSuccessCallback = (cb: (user: User, token: string) => void) => {
  onAuthSuccessCallback = cb;
};

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut();
  }
  await auth.signOut();
  cachedAccessToken = null;
};