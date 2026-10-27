import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { db } from '../db.ts';
export interface AuthRequest extends Request { user?: { userId: string; email: string; version: number }; }
export function generateToken(userId: string, email: string): string {
 const user = db.get.users.find(u => u.id === userId);
 if (!user) throw new Error('Cannot create session for missing user');
 return jwt.sign({userId,email,version:user.tokenVersion || 0},config.jwtSecret,{algorithm:'HS256',expiresIn:'2h',issuer:'studysniper',audience:'studysniper-web'});
}
export function authenticateToken(req: AuthRequest,res: Response,next: NextFunction) {
 const header = req.headers.authorization;
 if (!header?.startsWith('Bearer ')) return res.status(401).json({error:'Please sign in.'});
 try {
  const claims = jwt.verify(header.slice(7),config.jwtSecret,{algorithms:['HS256'],issuer:'studysniper',audience:'studysniper-web'}) as jwt.JwtPayload;
  const user = db.get.users.find(u => u.id === claims.userId);
  if (!user || !user.isVerified || claims.version !== (user.tokenVersion || 0)) throw new Error('Revoked');
  req.user = {userId:user.id,email:user.email,version:claims.version}; next();
 } catch { return res.status(401).json({error:'Session expired or revoked. Please sign in again.'}); }
}
