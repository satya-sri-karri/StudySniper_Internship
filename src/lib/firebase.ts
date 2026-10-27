import { initializeApp } from 'firebase/app';
import { getAuth,GoogleAuthProvider,signOut,signInWithPopup,reauthenticateWithPopup } from 'firebase/auth';
const firebaseConfig={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID};
export const firebaseEnabled=Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
export const auth=firebaseEnabled ? getAuth(initializeApp(firebaseConfig)) : null;
export const googleProvider=new GoogleAuthProvider();
export {signOut,signInWithPopup,reauthenticateWithPopup};
export function formatFirebaseError(err:any):string {
 if(err?.code==='auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
 if(err?.code==='auth/unauthorized-domain') return 'Add this app domain to Firebase Authentication authorized domains.';
 return err?.message || 'Google authentication failed. Please retry.';
}
