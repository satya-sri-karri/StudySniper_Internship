import agentsRouter from './routes/agents.ts';
import { config } from './config.ts';
import { authenticateToken, type AuthRequest } from './middleware/auth.ts';
import { validateRequest } from './validation.ts';
import { HttpError } from './http.ts';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.ts';
import chatRouter from './routes/chat.ts';
import docsRouter from './routes/documents.ts';
import quizRouter from './routes/quiz.ts';
import flashcardsRouter from './routes/flashcards.ts';
import studyPlanRouter from './routes/studyPlan.ts';
import notesRouter from './routes/notes.ts';
import codingRouter from './routes/coding.ts';
import dashboardRouter from './routes/dashboard.ts';



export const app = express();

// Trust reverse proxy headers (Cloud Run / Nginx ingress)
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));

// Framing is denied unless explicitly enabled for the preview origin.
app.use(helmet({
 contentSecurityPolicy: config.production ? { directives: {
  defaultSrc:["'self'"], scriptSrc:["'self'","https://apis.google.com"], styleSrc:["'self'","'unsafe-inline'"],
  connectSrc:["'self'","https://identitytoolkit.googleapis.com","https://securetoken.googleapis.com","https://*.googleapis.com"],
  frameSrc:["'self'","https://*.firebaseapp.com","https://accounts.google.com"],
  imgSrc:["'self'","data:","https://*.googleusercontent.com"], workerSrc:["'self'","blob:"],
  frameAncestors: process.env.ALLOW_PREVIEW_FRAME === 'true' ? ["https://aistudio.google.com"] : ["'none'"],
  upgradeInsecureRequests: null,
 }} : false,
 crossOriginOpenerPolicy:{policy:'same-origin-allow-popups'},
 frameguard: process.env.ALLOW_PREVIEW_FRAME === 'true' ? false : {action:'deny'},
}));
app.use('/api',rateLimit({windowMs:60000,limit:300,standardHeaders:true,legacyHeaders:false,message:{error:'Too many requests. Retry shortly.'}}));
// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' }
});

app.use(express.json({ limit: '1mb' }));


app.use('/api', validateRequest);
const aiLimiter=rateLimit({windowMs:3600000,limit:30,keyGenerator:(req:AuthRequest)=>req.user!.userId,standardHeaders:true,legacyHeaders:false,message:{error:'AI request limit reached. Retry later.'}});
const active=new Map<string,number>();
app.use('/api',(req:AuthRequest,res,next)=>{
 if(req.method!=='POST' || !/^\/(agents\/(parse|[^/]+\/(analyze|plan|quiz|assessments\/[^/]+\/evaluate))|chat\/message|documents\/(upload|[^/]+\/(ask|explain-section))|quiz\/generate|flashcards\/generate|study-planner\/generate|notes\/generate|coding\/analyze)$/.test(req.path)) return next();
 authenticateToken(req,res,()=>aiLimiter(req,res,()=>{
  const id=req.user!.userId;
  if((active.get(id)||0)>=2) return res.status(429).json({error:'Two AI requests are already running. Please wait.'});
  active.set(id,(active.get(id)||0)+1);
  let released=false;
  const release=()=>{if(released)return;released=true;clearTimeout(timer);const count=(active.get(id)||1)-1;count?active.set(id,count):active.delete(id);};
  const timer=setTimeout(release,65000);timer.unref();
  res.once('finish',release);
  next();
 }));
});
// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Study Sniper AI API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', docsRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/flashcards', flashcardsRouter);
app.use('/api/study-planner', studyPlanRouter);
app.use('/api/notes', notesRouter);
app.use('/api/coding', codingRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agents', agentsRouter);

app.use('/api',(_req,res)=>res.status(404).json({error:'API endpoint not found.'}));
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
 if(res.headersSent) return next(err);
 const status=err instanceof HttpError ? err.status : err.status===413 ? 413 : err instanceof SyntaxError && 'body' in err ? 400 : 500;
 const message=err instanceof HttpError ? err.message : status===413 ? 'Request too large.' : status===400 ? 'Invalid JSON body.' : 'Request failed. Please retry; contact support if it persists.';
 console.error('API request failed', {method:req.method,path:req.path,status});
 res.status(status).json({error:message});
});
