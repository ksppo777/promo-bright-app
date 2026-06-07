import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// AppData drive scope
const DRIVE_APP_DATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export interface User {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

let cachedAccessToken: string | null = null;
let googleTokenClient: any = null;
let onAuthSuccessCallback: ((user: User, token: string) => void) | null = null;
let cachedUser: User | null = null;

// Replace with the user's Web Client ID later
const WEB_CLIENT_ID = '926621621039-b6idpq9gvm3h1gn5ltb2p609pf401aaf.apps.googleusercontent.com';

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) setOnAuthSuccessCallback(onAuthSuccess);

  const performSilentLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          GoogleAuth.initialize({
            scopes: ['profile', 'email', DRIVE_APP_DATA_SCOPE],
          });
          const result = await GoogleAuth.refresh();
          if (result && result.accessToken) {
            cachedAccessToken = result.accessToken;
            cachedUser = {
              displayName: result.displayName || `${result.givenName || ''} ${result.familyName || ''}`.trim(),
              email: result.email || null,
              photoURL: result.imageUrl || null,
            };
            if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken);
            return;
          }
        } catch (e) {
          console.log('Silent login failed for native', e);
        }
      } else {
        // Web: We can check localStorage if we saved token/user, but access token expires in 1 hour.
        // GIS doesn't have an automatic silent login for OAuth implicit flow that gives a fresh token without a prompt.
        // Let's just fail silent login on web for now, or trigger the prompt if needed.
      }
    } catch (err) {
      console.log('Init auth error:', err);
    }
    if (onAuthFailure) onAuthFailure();
  };

  performSilentLogin();

  // Return a dummy unsubscribe function
  return () => {};
};

const fetchUserInfoFromWeb = async (token: string): Promise<User> => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  const data = await res.json();
  return {
    displayName: data.name || null,
    email: data.email || null,
    photoURL: data.picture || null,
  };
};

export const googleSignIn = async (): Promise<{ user: User, accessToken: string } | null> => {
  if (Capacitor.isNativePlatform()) {
    const result = await GoogleAuth.signIn();
    if (result && result.accessToken) {
      cachedAccessToken = result.accessToken;
      cachedUser = {
        displayName: result.displayName || `${result.givenName || ''} ${result.familyName || ''}`.trim(),
        email: result.email || null,
        photoURL: result.imageUrl || null,
      };
      if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken);
      return { user: cachedUser, accessToken: cachedAccessToken };
    }
    throw new Error('Google Sign-In failed on Native');
  } else {
    // Web GIS
    return new Promise((resolve, reject) => {
      // @ts-ignore
      if (!window.google) {
        reject(new Error('Google Identity Services script not loaded.'));
        return;
      }
      
      if (!googleTokenClient) {
        // @ts-ignore
        googleTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: WEB_CLIENT_ID,
          scope: `profile email ${DRIVE_APP_DATA_SCOPE}`,
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                cachedAccessToken = tokenResponse.access_token;
                const user = await fetchUserInfoFromWeb(cachedAccessToken!);
                cachedUser = user;
                if (onAuthSuccessCallback) onAuthSuccessCallback(cachedUser, cachedAccessToken!);
                resolve({ user: cachedUser, accessToken: cachedAccessToken! });
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error('Token response missing access_token'));
            }
          },
          error_callback: (err: any) => {
            reject(err);
          }
        });
      }
      
      googleTokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setOnAuthSuccessCallback = (cb: (user: User, token: string) => void) => {
  onAuthSuccessCallback = cb;
  if (cachedUser && cachedAccessToken) {
    cb(cachedUser, cachedAccessToken);
  }
};

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch(e) {}
  }
  cachedAccessToken = null;
  cachedUser = null;
};