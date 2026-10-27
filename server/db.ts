import type {Pipeline} from './agents/schemas.ts';
import './config.ts';
import fs from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isVerified?: boolean;
  failedLoginAttempts?: number;
  lockUntil?: string | null;
  tokenVersion?: number;
  firebaseUid?: string;
  authProvider?: 'local' | 'firebase';
  avatar?: string;
  targetExam?: string;
  dailyGoalHours?: number;
  streakDays: number;
  lastActiveDate: string;
  createdAt: string;
}

export interface OtpRecord {
  id: string;
  email: string;
  codeHash: string;
  purpose: 'email_verification' | 'password_reset';
  expiresAt: string;
  resendCooldownUntil?: string;
  resendAttempts?: number;
  attempts?: number;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  userId?: string | null;
  email: string;
  event: 'REGISTER' | 'OTP_SENT' | 'VERIFY_SUCCESS' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOCKOUT' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS' | 'LOGOUT' | 'LOGOUT_ALL_DEVICES';
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  bookmarked?: boolean;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  summary?: string;
  keyTopics?: string[];
  uploadedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  subject: string;
  summary: string;
  keyPoints: string[];
  definitions: { term: string; definition: string }[];
  formulas: string[];
  content: string;
  tags: string[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  deckTitle: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  repetitions: number;
  interval: number;
  easeFactor: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_in_blank' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  score?: number;
  totalQuestions: number;
  completedAt?: string;
  attempts?: { score: number; answers: Record<string,string>; completedAt: string }[];
  createdAt: string;
}

export interface StudyTask {
  id: string;
  day: string; // e.g. "Day 1", "Monday"
  subject: string;
  topic: string;
  durationMinutes: number;
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  subjects: string[];
  examDate: string;
  dailyHours: number;
  tasks: StudyTask[];
  createdAt: string;
}

export interface DatabaseSchema {
  pipelines: Pipeline[];
  users: User[];
  otps: OtpRecord[];
  auditLogs: AuditLogRecord[];
  chats: Chat[];
  messages: Message[];
  documents: Document[];
  notes: Note[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
  studyPlans: StudyPlan[];
}

function initialData(): DatabaseSchema {
  return {
    pipelines: [],
    users: [],
    otps: [],
    auditLogs: [],
    chats: [],
    messages: [],
    documents: [],
    notes: [],
    flashcards: [],
    quizzes: [],
    studyPlans: []
  };
}

export class JSONDatabase {
  private data: DatabaseSchema;
  private committed = '';
  private lockFile = path.join(DATA_DIR, 'db.lock');
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    // JSON storage is deliberately single-process; refuse competing writers.
    if (fs.existsSync(this.lockFile)) {
      const pid = Number(fs.readFileSync(this.lockFile, 'utf8'));
      if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid database lock; inspect it before removing.');
      try { process.kill(pid, 0); throw new Error('Database is already in use by another process.'); }
      catch (error: any) { if (error.code !== 'ESRCH') throw error; fs.unlinkSync(this.lockFile); }
    }
    fs.writeFileSync(this.lockFile, String(process.pid), { flag: 'wx', mode: 0o600 });
    process.once('exit', () => { try { fs.unlinkSync(this.lockFile); } catch {} });
    if (fs.existsSync(DB_FILE)) {
      // Fail closed on corrupt data; never overwrite the only copy.
      this.data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const key of Object.keys(initialData()) as (keyof DatabaseSchema)[]) {
        if (this.data[key] === undefined && ['otps','auditLogs','pipelines'].includes(key)) (this.data as any)[key] = [];
        if (!Array.isArray(this.data[key])) throw new Error(`Invalid database collection: ${key}`);
      }
      this.committed = JSON.stringify(this.data);
    } else { this.data = initialData(); this.save(); }
  }
  public get get(): DatabaseSchema { return this.data; }
  public save() {
    const temporary = DB_FILE + '.' + randomUUID() + '.tmp';
    try {
      const owners=new Set(this.data.users.map(u=>u.id));
      for(const key of ['chats','documents','notes','flashcards','quizzes','studyPlans','pipelines'] as const) {
        if(this.data[key].some(record=>!owners.has(record.userId))) throw new Error('Cannot save records for a deleted account.');
      }
      const json = JSON.stringify(this.data);
      if (Buffer.byteLength(json) > 32 * 1024 * 1024) throw new Error('Database size limit reached');
      const fd = fs.openSync(temporary, 'wx', 0o600);
      try { fs.writeFileSync(fd, json); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temporary, DB_FILE);
      this.committed = json;
    } catch (error) {
      if (this.committed) this.data = JSON.parse(this.committed);
      try { fs.unlinkSync(temporary); } catch {}
      throw error;
    }
  }
}

export function safeUser(user: User) {
  return {id:user.id,name:user.name,email:user.email,avatar:user.avatar,targetExam:user.targetExam,dailyGoalHours:user.dailyGoalHours,streakDays:user.streakDays,lastActiveDate:user.lastActiveDate,createdAt:user.createdAt,isVerified:user.isVerified,authProvider:user.authProvider || 'local'};
}

export const db = new JSONDatabase();

export function touchUserStreak(userId: string) {
  const user = db.get.users.find(u => u.id === userId);
  if (!user) return null;

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  if (!user.lastActiveDate) {
    user.streakDays = 1;
    user.lastActiveDate = now.toISOString();
    db.save();
  } else {
    const lastActive = new Date(user.lastActiveDate);
    const lastActiveDateStr = lastActive.toISOString().split('T')[0];

    if (lastActiveDateStr === todayDateStr) {
      if (!user.streakDays || user.streakDays < 1) {
        user.streakDays = 1;
      }
      user.lastActiveDate = now.toISOString();
      db.save();
    } else {
      const tDate = new Date(todayDateStr);
      const lDate = new Date(lastActiveDateStr);
      const diffTime = Math.abs(tDate.getTime() - lDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive calendar day! Increment streak
        user.streakDays = (user.streakDays || 1) + 1;
      } else if (diffDays > 1) {
        // Missed one or more calendar days, reset streak to 1
        user.streakDays = 1;
      }
      user.lastActiveDate = now.toISOString();
      db.save();
    }
  }

  return safeUser(user);
}
