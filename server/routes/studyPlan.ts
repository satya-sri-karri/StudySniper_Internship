import {maintainUser} from '../services/progress.ts';
import {rebalance} from '../services/learning.ts';
import {calendar} from '../services/calendar.ts';
import {HttpError} from '../http.ts';
import {z} from 'zod';
import {futureDate} from '../agents/schemas.ts';
import { Router } from '../http.ts';
import { Response } from 'express';
import { db, StudyPlan } from '../db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { generateStudyPlanJSON } from '../services/ai.ts';

const router = Router();

// Get study plans
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  maintainUser(userId);
  const plans = db.get.studyPlans
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ studyPlans: plans });
});

// Generate new Study Plan
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { title, subjects, examDate, dailyHours } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'At least one subject is required' });
  }

  const hours = Number(dailyHours) || 3;
  const planTitle = title || `${subjects.join(', ')} Sniper Plan`;

  const generated = await generateStudyPlanJSON({
    title: planTitle,
    subjects,
    examDate: examDate || 'Upcoming Exam',
    dailyHours: hours
  });

  const formattedTasks = (generated.tasks || []).map((t: any, idx: number) => ({
    id: `task_${Date.now()}_${idx}`,
    day: t.day || `Day ${idx + 1}`,
    subject: t.subject || subjects[idx % subjects.length],
    topic: t.topic || `Core Mastery Module ${idx + 1}`,
    durationMinutes: t.durationMinutes || 45,
    completed: false
  }));

  const newPlan: StudyPlan = {
    id: 'sp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    title: planTitle,
    subjects,
    examDate: examDate || 'In 30 Days',
    dailyHours: hours,
    tasks: formattedTasks,
    createdAt: new Date().toISOString()
  };

  db.get.studyPlans.push(newPlan);
  db.save();

  return res.json({ studyPlan: newPlan });
});

// Toggle Task completion
router.put('/:id/task/:taskId/toggle', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id, taskId } = req.params;

  const plan = db.get.studyPlans.find(p => p.id === id && p.userId === userId);
  if (!plan) {
    return res.status(404).json({ error: 'Study plan not found' });
  }

  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found in study plan' });
  }

  if(task.unscheduled)throw new HttpError(409,'Reschedule this task before marking it complete.');
  task.completed = !task.completed;
  db.save();

  return res.json({ studyPlan: plan, task });
});

// Delete study plan
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id;

  const index = db.get.studyPlans.findIndex(p => p.id === id && p.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Study plan not found' });
  }

  db.get.studyPlans.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

router.post('/:id/replan',authenticateToken,(req:AuthRequest,res)=>{
 const plan=db.get.studyPlans.find(p=>p.id===req.params.id&&p.userId===req.user!.userId);
 if(!plan)throw new HttpError(404,'Plan not found.');
 const input=z.object({dailyHours:z.number().min(0.25).max(12).optional(),examDate:futureDate.optional()}).safeParse(req.body);
 if(!input.success)throw new HttpError(400,'Invalid hours or exam date.');
 const run=db.get.pipelines.find(p=>p.planId===plan.id&&p.userId===req.user!.userId);
 if(input.data.dailyHours){plan.dailyHours=input.data.dailyHours;if(run)run.dailyHours=input.data.dailyHours;}
 if(input.data.examDate){plan.examDate=input.data.examDate;if(run)for(const t of run.topics)t.examDate=input.data.examDate;}
 rebalance(plan,run,'Availability updated');db.save();res.json({studyPlan:plan});
});
router.get('/:id/calendar',authenticateToken,(req:AuthRequest,res)=>{
 maintainUser(req.user!.userId);
 const plan=db.get.studyPlans.find(p=>p.id===req.params.id&&p.userId===req.user!.userId);
 if(!plan)throw new HttpError(404,'Plan not found.');
 res.json({fileName:'studysniper-plan.ics',content:calendar(plan)});
});
export default router;
