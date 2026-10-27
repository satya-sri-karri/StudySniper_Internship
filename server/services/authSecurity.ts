import { randomInt, randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config.ts';
import { HttpError } from '../http.ts';
import { db, User, OtpRecord, AuditLogRecord } from '../db.ts';
import { sendOtpEmail } from './mailer.ts';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  errors: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notCommon: boolean;
    notPersonal: boolean;
  };
}

const COMMON_DISALLOWED_PASSWORDS = new Set([
  'password123456',
  '123456789012',
  'admin12345678',
  'welcome123456',
  'iloveyou12345',
  'qwerty1234567',
  'studysniper12'
]);

export function validatePasswordStrength(
  password: string = '',
  name: string = '',
  email: string = ''
): PasswordValidationResult {
  const errors: string[] = [];
  const checks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    notCommon: true,
    notPersonal: true
  };

  if (!checks.minLength) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!checks.hasUppercase) {
    errors.push('Include at least one uppercase letter (A-Z)');
  }
  if (!checks.hasLowercase) {
    errors.push('Include at least one lowercase letter (a-z)');
  }
  if (!checks.hasNumber) {
    errors.push('Include at least one number (0-9)');
  }
  if (!checks.hasSpecial) {
    errors.push('Include at least one special character (e.g. !@#$%)');
  }

  // Check common weak passwords
  const cleanPass = password.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (COMMON_DISALLOWED_PASSWORDS.has(cleanPass) || cleanPass.startsWith('password') || cleanPass.startsWith('12345678')) {
    checks.notCommon = false;
    errors.push('Password is too common or easily guessable');
  }

  // Check personal info similarity
  if (email) {
    const emailPrefix = email.split('@')[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
      checks.notPersonal = false;
      errors.push('Password cannot contain parts of your email address');
    }
  }

  if (name) {
    const nameParts = name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
    for (const part of nameParts) {
      if (password.toLowerCase().includes(part)) {
        checks.notPersonal = false;
        errors.push('Password cannot contain your name');
        break;
      }
    }
  }

  // Calculate percentage score
  let passedCount = 0;
  if (checks.minLength) passedCount += 25;
  if (checks.hasUppercase) passedCount += 15;
  if (checks.hasLowercase) passedCount += 15;
  if (checks.hasNumber) passedCount += 15;
  if (checks.hasSpecial) passedCount += 15;
  if (checks.notCommon) passedCount += 7.5;
  if (checks.notPersonal) passedCount += 7.5;

  const score = Math.min(100, Math.round(passedCount));

  let label: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  if (score >= 90) label = 'Strong';
  else if (score >= 70) label = 'Good';
  else if (score >= 45) label = 'Fair';

  const isValid = Object.values(checks).every(Boolean);

  return {
    isValid,
    score,
    label,
    errors,
    checks
  };
}

export function logAuditEvent(
  email: string,
  event: AuditLogRecord['event'],
  userId?: string | null,
  ip?: string,
  userAgent?: string
) {
  const record: AuditLogRecord = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: userId || null,
    email: email.toLowerCase(),
    event,
    ip: ip || '127.0.0.1',
    userAgent,
    timestamp: new Date().toISOString()
  };
  db.get.auditLogs.push(record);
  db.save();
}

const pending = new Set<string>();
const digest = (code: string) => createHmac('sha256',config.jwtSecret).update('otp:'+code).digest('hex');
export async function createOtp(email: string, purpose: OtpRecord['purpose'], userName?: string) {
  const key = email + ':' + purpose;
  if (pending.has(key)) throw new HttpError(429, 'A code is already being sent.');
  const previous = db.get.otps.find(o => o.email === email && o.purpose === purpose);
  if (previous && Date.parse(previous.resendCooldownUntil || '') > Date.now()) throw new HttpError(429,'Wait 60 seconds before requesting another code.');
  const inWindow = previous && Date.now() - Date.parse(previous.createdAt) < 3600000;
  if (inWindow && (previous.resendAttempts || 0) >= 4) throw new HttpError(429,'Code request limit reached. Retry in one hour.');
  pending.add(key);
  try {
    const code = String(randomInt(100000,1000000));
    const record: OtpRecord = {id:randomUUID(),email,codeHash:digest(code),purpose,attempts:0,
      expiresAt:new Date(Date.now()+300000).toISOString(),resendCooldownUntil:new Date(Date.now()+60000).toISOString(),
      resendAttempts:inWindow ? (previous!.resendAttempts || 0)+1 : 1,createdAt:inWindow ? previous!.createdAt : new Date().toISOString()};
    const result=await sendOtpEmail({to:email,code,purpose,userName});
    if(!result.success) throw new HttpError(503,'Email delivery failed. Please retry later.');
    db.get.otps=db.get.otps.filter(o=>!(o.email===email && o.purpose===purpose));
    db.get.otps.push(record);db.save();
    return {emailSent:true};
  } finally { pending.delete(key); }
}
export async function verifyOtp(email: string, code: string, purpose: OtpRecord['purpose']) {
  const record=db.get.otps.find(o=>o.email===email && o.purpose===purpose);
  if(!record || Date.parse(record.expiresAt)<=Date.now() || (record.attempts || 0)>=5) return {success:false,error:'Invalid or expired code. Request a new code.'};
  const expected=Buffer.from(record.codeHash,'hex'), actual=Buffer.from(digest(code),'hex');
  record.attempts=(record.attempts||0)+1;
  const matches=expected.length===actual.length && timingSafeEqual(expected,actual);
  if(matches) db.get.otps=db.get.otps.filter(o=>o.id!==record.id);
  db.save();
  return matches ? {success:true} : {success:false,error:'Invalid or expired code.'};
}
