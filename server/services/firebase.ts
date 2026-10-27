import '../config.ts';
import { HttpError } from '../http.ts';
// Firebase's REST lookup validates the ID token with the Auth backend.
// https://firebase.google.com/docs/reference/rest/auth#section-get-account-info
export async function firebaseRequest(action: 'lookup' | 'delete', idToken: string) {
 const key = process.env.FIREBASE_API_KEY;
 if (!key || !process.env.FIREBASE_PROJECT_ID) throw new HttpError(503,'Google sign-in is not configured. Use email sign-in.');
 let response: Response;
 try { response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken}),signal:AbortSignal.timeout(10000)}); }
 catch { throw new HttpError(503,'Identity service is unavailable. Please retry.'); }
 if (!response.ok) throw new HttpError(401,'Firebase session is invalid. Sign in again.');
 return response.json();
}
export async function verifyFirebase(idToken: string) {
 const result = await firebaseRequest('lookup', idToken);
 let claims: any;
 try { claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()); } catch { throw new HttpError(401,'Invalid Firebase token'); }
 const user = result.users?.[0];
 if (!user || user.disabled || !user.emailVerified || !user.email || claims.aud !== process.env.FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}` || claims.sub !== user.localId || claims.exp * 1000 <= Date.now() || claims.auth_time < Number(user.validSince || 0)) throw new HttpError(401,'Use a verified, current Firebase account from this project.');
 return {uid:user.localId as string,email:user.email.toLowerCase() as string,name:String(user.displayName || user.email.split('@')[0]).slice(0,100),authTime:claims.auth_time as number};
}
