import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Router, HttpError } from '../http.ts';
import { db, safeUser, touchUserStreak, type User } from '../db.ts';
import { generateToken, authenticateToken, type AuthRequest } from '../middleware/auth.ts';
import { validatePasswordStrength, createOtp, verifyOtp } from '../services/authSecurity.ts';
import { verifyFirebase, firebaseRequest } from '../services/firebase.ts';
import { config } from '../config.ts';
import { ensureMailer } from '../services/mailer.ts';
const router = Router();
const findUser = (email: string) => db.get.users.find(u => u.email === email);
function checkPassword(password: string,user: Pick<User,'name'|'email'>) {
 const result = validatePasswordStrength(password,user.name,user.email);
 if (!result.isValid) throw new HttpError(400,result.errors.join('. '));
}
function session(user: User) { return {token:generateToken(user.id,user.email),user:safeUser(user)}; }
router.post('/signup',async (req,res) => {
 const {name,email,password} = req.body;
 checkPassword(password,{name,email}); ensureMailer();
 if (findUser(email)) throw new HttpError(409,'Account already exists. Sign in or request a verification code.');
 const passwordHash = await bcrypt.hash(password,12);
 if (findUser(email)) throw new HttpError(409,'Account already exists.');
 const user: User = {id:randomUUID(),name,email,passwordHash,authProvider:'local',isVerified:false,tokenVersion:0,streakDays:0,lastActiveDate:'',createdAt:new Date().toISOString()};
 db.get.users.push(user); db.save();
 await createOtp(email,'email_verification',name);
 res.status(201).json({requiresVerification:true,email,message:'Check your email for the verification code.'});
});
router.post('/firebase-login',async (req,res) => {
 const identity = await verifyFirebase(req.body.idToken);
 let user = findUser(identity.email);
 // Migrate only legacy Firebase records whose stored UID matches the verified identity.
 if(user && !user.authProvider && user.passwordHash==='FIREBASE_AUTHENTICATED_USER' && user.id==='usr_fb_'+identity.uid) {user.authProvider='firebase';user.firebaseUid=identity.uid;user.passwordHash='';user.isVerified=true;user.tokenVersion=(user.tokenVersion||0)+1;db.save();}
 if (user && (user.authProvider !== 'firebase' || user.firebaseUid !== identity.uid)) throw new HttpError(409,'This email uses local sign-in. Sign in with your StudySniper password.');
 if (!user) {
  user = {id:randomUUID(),name:identity.name,email:identity.email,passwordHash:'',firebaseUid:identity.uid,authProvider:'firebase',isVerified:true,tokenVersion:0,streakDays:0,lastActiveDate:'',createdAt:new Date().toISOString()};
  db.get.users.push(user); db.save();
 }
 res.json(session(user));
});
router.post('/login',async (req,res) => {
 const {email,password} = req.body;
 const user = findUser(email);
 if (user?.lockUntil && Date.parse(user.lockUntil)>Date.now()) throw new HttpError(423,'Too many failed logins. Retry in 15 minutes.');
 if (!user || user.authProvider === 'firebase' || !await bcrypt.compare(password,user.passwordHash)) {
  if (user) { user.failedLoginAttempts = (user.failedLoginAttempts || 0)+1; if (user.failedLoginAttempts>=5) {user.lockUntil=new Date(Date.now()+900000).toISOString();user.failedLoginAttempts=0;} db.save(); }
  throw new HttpError(401,'Invalid credentials. Google accounts must use Google sign-in.');
 }
 if (!user.isVerified) return res.status(403).json({error:'Verify your email first. Request a new code below.',requiresVerification:true,email});
 user.failedLoginAttempts=0; user.lockUntil=null; db.save(); res.json(session(user));
});
router.post('/verify-otp',async (req,res) => {
 const {email,otpCode,purpose} = req.body;
 if (purpose !== 'email_verification') throw new HttpError(400,'Submit the reset code together with your new password.');
 const user = findUser(email);
 if (!user || user.authProvider === 'firebase') throw new HttpError(400,'Invalid verification request.');
 const result=await verifyOtp(email,otpCode,purpose);
 if (!result.success) throw new HttpError(400,result.error!);
 user.isVerified=true; user.tokenVersion=(user.tokenVersion||0)+1; db.save(); res.json(session(user));
});
async function sendCode(email: string,purpose:'email_verification'|'password_reset') {
 ensureMailer();
 const user=findUser(email);
 if (user && user.authProvider !== 'firebase' && (purpose==='password_reset' || !user.isVerified)) await createOtp(email,purpose,user.name);
 return {email,message:'If this email has an eligible local account, a code has been sent. Google accounts use Google recovery.'};
}
router.post('/forgot-password',async(req,res)=>res.json(await sendCode(req.body.email,'password_reset')));
router.post('/resend-otp',async(req,res)=>res.json(await sendCode(req.body.email,req.body.purpose)));
router.post('/reset-password',async(req,res)=>{
 const {email,otpCode,newPassword}=req.body; const user=findUser(email);
 if(!user || user.authProvider==='firebase') throw new HttpError(400,'Invalid local password reset request.');
 checkPassword(newPassword,user);
 const passwordHash=await bcrypt.hash(newPassword,12);
 const result=await verifyOtp(email,otpCode,'password_reset');
 if(!result.success) throw new HttpError(400,result.error!);
 user.passwordHash=passwordHash;user.isVerified=true;user.failedLoginAttempts=0;user.lockUntil=null;user.tokenVersion=(user.tokenVersion||0)+1;db.save();
 res.json({message:'Password reset. All previous sessions have been revoked.'});
});
router.get('/me',authenticateToken,(req:AuthRequest,res)=>res.json({user:safeUser(findUser(req.user!.email)!)}));
router.post('/streak/increment',authenticateToken,(req:AuthRequest,res)=>res.json({user:touchUserStreak(req.user!.userId)}));
router.put('/profile',authenticateToken,(req:AuthRequest,res)=>{
 const user=findUser(req.user!.email)!;Object.assign(user,req.body);db.save();res.json({user:safeUser(user)});
});
router.put('/password',authenticateToken,async(req:AuthRequest,res)=>{
 const user=findUser(req.user!.email)!;
 if(user.authProvider==='firebase') throw new HttpError(400,'Manage your Google password with Google.');
 if(!await bcrypt.compare(req.body.currentPassword,user.passwordHash)) throw new HttpError(401,'Current password is incorrect.');
 checkPassword(req.body.newPassword,user);user.passwordHash=await bcrypt.hash(req.body.newPassword,12);user.tokenVersion=(user.tokenVersion||0)+1;db.save();res.json(session(user));
});
router.post('/logout',authenticateToken,(req:AuthRequest,res)=>{
 const user=findUser(req.user!.email)!;user.tokenVersion=(user.tokenVersion||0)+1;db.save();res.json({message:'All StudySniper sessions signed out.'});
});
router.delete('/account',authenticateToken,async(req:AuthRequest,res)=>{
 const user=findUser(req.user!.email)!;
 if(user.authProvider==='firebase') {
  if(!req.body.idToken) throw new HttpError(400,'Reauthenticate with Google to delete this account.');
  const identity=await verifyFirebase(req.body.idToken);
  if(identity.uid!==user.firebaseUid || Date.now()/1000-identity.authTime>300) throw new HttpError(401,'Reauthenticate with Google, then retry.');
  await firebaseRequest('delete',req.body.idToken);
 } else if(!req.body.password || !await bcrypt.compare(req.body.password,user.passwordHash)) throw new HttpError(400,'Confirm your current password.');
 const chats=new Set(db.get.chats.filter(c=>c.userId===user.id).map(c=>c.id));
 db.get.messages=db.get.messages.filter(m=>!chats.has(m.chatId));
 for(const key of ['chats','documents','notes','flashcards','quizzes','studyPlans','auditLogs'] as const) (db.get as any)[key]=db.get[key].filter((x:any)=>x.userId!==user.id);
 db.get.otps=db.get.otps.filter(o=>o.email!==user.email);db.get.users=db.get.users.filter(u=>u.id!==user.id);db.save();res.json({message:'Account and study data deleted.'});
});
router.get('/config',(_req,res)=>res.json({demo:config.demo}));
router.post('/demo',async(_req,res)=>{
 if(!config.demo) throw new HttpError(404,'Demo is disabled.');
 const {createDemoUser}=await import('../services/demo.ts');
 res.json(session(createDemoUser()));
});
export default router;
