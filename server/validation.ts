import { z } from 'zod';
import type { RequestHandler } from 'express';
const text = (max = 200) => z.string().trim().min(1).max(max);
const password = z.string().min(1).max(72).refine(s => Buffer.byteLength(s) <= 72, 'Password must not exceed 72 UTF-8 bytes');
const email = z.email().max(254).transform(s => s.toLowerCase());
const otp = z.string().regex(/^\d{6}$/);
const purpose = z.enum(['email_verification','password_reset']).default('email_verification');
export const difficulty = z.enum(['easy','medium','hard']);
export const questionType = z.enum(['mcq','true_false','fill_in_blank','short_answer']);
export const sourceText = text(200000);
export const noteSchema = z.object({title:text(),summary:text(12000),keyPoints:z.array(text(4000)).max(50), definitions:z.array(z.object({term:text(),definition:text(4000)})).max(50),formulas:z.array(text(2000)).max(50).default([]),tags:z.array(text(80)).max(20).default([])});
export const questionSchema = z.object({type:questionType,question:text(4000),options:z.array(text(2000)).min(2).max(6).optional(),correctAnswer:text(4000),explanation:text(6000)}).refine(q => !['mcq','true_false'].includes(q.type) || (!!q.options && q.options.includes(q.correctAnswer)), 'Choice questions must include the correct answer in options');
export const cardSchema = z.object({front:text(4000),back:text(6000),difficulty:difficulty.default('medium')});
export const planSchema = z.object({title:text(),tasks:z.array(z.object({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),subject:text(),topic:text(1000),durationMinutes:z.number().int().min(5).max(720)})).min(1).max(500)});
const futureDate = text(10).regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s && s >= new Date().toISOString().slice(0,10) && Date.parse(s) - Date.now() <= 366*86400000, 'Use a valid exam date within the next year');
const shapes: [string, RegExp, z.ZodType][] = [
 ['POST',/^\/auth\/signup$/,z.object({name:text(100),email,password})],
 ['POST',/^\/auth\/login$/,z.object({email,password})],
 ['POST',/^\/auth\/firebase-login$/,z.object({idToken:text(10000)})],
 ['POST',/^\/auth\/verify-otp$/,z.object({email,otpCode:otp,purpose})],
 ['POST',/^\/auth\/(forgot-password|resend-otp)$/,z.object({email,purpose})],
 ['POST',/^\/auth\/reset-password$/,z.object({email,otpCode:otp,newPassword:password})],
 ['PUT',/^\/auth\/password$/,z.object({currentPassword:password,newPassword:password})],
 ['DELETE',/^\/auth\/account$/,z.object({password:password.optional(),idToken:text(10000).optional()})],
 ['PUT',/^\/auth\/profile$/,z.object({name:text(100).optional(),targetExam:z.string().trim().max(200).optional(),dailyGoalHours:z.number().min(0.25).max(12).optional()})],
 ['POST',/^\/chat\/conversations$/,z.object({title:text().optional()})],
 ['POST',/^\/chat\/message$/,z.object({chatId:text(),prompt:text(12000),systemPrompt:text(500).optional(),documentId:text().optional()})],
 ['POST',/^\/chat\/bookmark$/,z.object({messageId:text()})],
 ['POST',/^\/documents\/upload$/,z.object({fileName:text(255),fileType:z.enum(['PDF','DOCX','PPTX','TXT','MD','CSV','JSON','JS','TS','PY','JAVA','C','CPP','HTML','CSS','LOG','SRT','RST','XML','YAML','YML']),fileSize:z.number().int().min(1).max(10*1024*1024),textContent:sourceText,summarize:z.boolean().optional()})],
 ['POST',/^\/documents\/[^/]+\/ask$/,z.object({question:text(2000)})],
 ['POST',/^\/documents\/[^/]+\/explain-section$/,z.object({selectedText:text(12000)})],
 ['POST',/^\/quiz\/generate$/,z.object({topic:text(),subject:text().optional(),difficulty,questionCount:z.number().int().min(1).max(15),types:z.array(questionType).min(1).max(4),documentId:text(),pipelineId:text().optional(),topicId:text().optional()}).refine(v=>!!v.pipelineId===!!v.topicId,'Select both pipeline and topic')],
 ['POST',/^\/quiz\/[^/]+\/submit$/,z.object({attemptId:text(100).optional(),answers:z.record(z.string().max(200),z.string().max(4000)).refine(v => Object.keys(v).length<=15)})],
 ['POST',/^\/flashcards\/generate$/,z.object({topic:text(),count:z.number().int().min(1).max(20),documentId:text()})],
 ['POST',/^\/flashcards$/,z.object({deckTitle:text().optional(),front:text(4000),back:text(6000),difficulty:difficulty.optional()})],
 ['PUT',/^\/flashcards\/[^/]+\/review$/,z.object({rating:z.enum(['again','hard','good','easy'])})],
 ['POST',/^\/study-planner\/generate$/,z.object({title:text().optional(),subjects:z.array(text()).min(1).max(20),examDate:futureDate,dailyHours:z.number().min(0.25).max(12)})],
 ['POST',/^\/notes\/generate$/,z.object({topic:text(),subject:z.string().trim().max(200).optional(),rawContent:text(20000)})],
 ['POST',/^\/notes$/,noteSchema.extend({content:sourceText.optional(),subject:text().optional()})],
 ['POST',/^\/coding\/analyze$/,z.object({code:text(20000),language:z.enum(['python','cpp','java','javascript']),action:z.enum(['explain','debug','optimize','examples'])})],
];
export const validateRequest: RequestHandler = (req,res,next) => {
 const schema = shapes.find(([method,path]) => method === req.method && path.test(req.path))?.[2];
 if (!schema) return next();
 const parsed = schema.safeParse(req.body);
 if (!parsed.success) return void res.status(400).json({error:parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')});
 req.body = parsed.data; next();
};
