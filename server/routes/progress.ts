import {Router,HttpError} from '../http.ts';
import {db} from '../db.ts';
import {authenticateToken,type AuthRequest} from '../middleware/auth.ts';
import {maintainUser} from '../services/progress.ts';
import {readiness,dayOf,nextReview} from '../services/learning.ts';
const router=Router();router.use(authenticateToken);
router.get('/',(req:AuthRequest,res)=>{
 maintainUser(req.user!.userId);
 res.json({exams:db.get.pipelines.filter(p=>p.userId===req.user!.userId).map(p=>({...readiness(p),documentId:p.documentId})),intervals:[1,3,7,14,30],today:dayOf(),formula:'Topic = recent mastery × (0.5 + 0.5 × min(attempts/3, 1)) × 0.85 if review overdue; unassessed = 0. Exam = weighted topic mean. A study indicator, not a predicted exam mark.'});
});
router.post('/:id/topics/:topicId/review',(req:AuthRequest,res)=>{
 const run=db.get.pipelines.find(p=>p.id===req.params.id&&p.userId===req.user!.userId);
 if(!run||!run.topics.some(t=>t.id===req.params.topicId))throw new HttpError(404,'Topic not found.');
 if(!['again','good'].includes(req.body?.rating))throw new HttpError(400,'Use again or good.');
 const today=dayOf(),old=run.reviews?.[req.params.topicId];
 if(old&&old.nextReview>today)throw new HttpError(409,'This topic is not due yet. You can still use Practice.');
 run.reviews??={};run.reviews[req.params.topicId]=nextReview(old,req.body.rating==='good');db.save();
 res.json({exam:readiness(run)});
});
router.get('/notifications',(req:AuthRequest,res)=>{
 maintainUser(req.user!.userId);res.json({notifications:db.get.notifications.filter(n=>n.userId===req.user!.userId&&!n.read).sort((a,b)=>b.day.localeCompare(a.day))});
});
router.put('/notifications/read',(req:AuthRequest,res)=>{
 const ids=req.body?.ids;
 if(!Array.isArray(ids)||ids.length>200||ids.some(id=>typeof id!=='string'||id.length>500))throw new HttpError(400,'Supply up to 200 notification IDs.');
 for(const n of db.get.notifications)if(n.userId===req.user!.userId&&ids.includes(n.id))n.read=true;
 db.save();res.json({success:true});
});
export default router;
