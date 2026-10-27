import dotenv from 'dotenv';
// Load configuration before any dependent module reads it; never override host secrets.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
if(process.argv[1]?.endsWith('server.mjs')) process.env.NODE_ENV='production';
const secret = process.env.JWT_SECRET || '';
if (secret.length < 32 || /change|super.secret|example/i.test(secret)) {
  throw new Error('JWT_SECRET must be a unique random secret of at least 32 characters.');
}
export const config = {
  jwtSecret: secret,
  production: process.env.NODE_ENV === 'production',
  aiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  demo: process.env.ENABLE_DEMO === 'true' && process.env.NODE_ENV !== 'production',
};
