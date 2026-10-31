import {createHash} from 'node:crypto';
import {recordResult,rebalance,dayOf} from '../services/learning.ts';
import {maintainUser} from '../services/progress.ts';
import { Router, HttpError } from '../http.ts';
import { Response } from 'express';
import { db, Quiz, touchUserStreak } from '../db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { generateQuizJSON } from '../services/ai.ts';

import { sourceForTopic } from '../services/retrieval.ts';
const router = Router();
const publicQuiz = (q: Quiz) => ({...q, attempts:undefined, questions:q.questions.map(({correctAnswer,explanation,...question})=>question)});

// Get list of user quizzes
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const quizzes = db.get.quizzes
    .filter(q => q.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ quizzes: quizzes.map(publicQuiz) });
});

// Generate Quiz
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { topic, subject, difficulty, questionCount, types, documentId, pipelineId, topicId } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const run=pipelineId?db.get.pipelines.find(p=>p.id===pipelineId&&p.userId===userId):undefined;
  if(pipelineId&&(!run||run.documentId!==documentId||!run.topics.some(t=>t.id===topicId&&t.name===topic)))throw new HttpError(400,'Choose a topic and source belonging to your pipeline.');
  const numQuestions = Number(questionCount) || 5;
  const quizTypes = Array.isArray(types) && types.length > 0 ? types : ['mcq', 'true_false'];
  const diff = difficulty || 'medium';

  const questions = await generateQuizJSON({
    topic,
    documentText: sourceForTopic(userId, documentId, topic),
    difficulty: diff,
    questionCount: numQuestions,
    types: quizTypes
  });

  const formattedQuestions = questions.map((q: any, idx: number) => ({
    id: `q_${Date.now()}_${idx}`,
    type: q.type,
    question: q.question,
    options: q.options || (q.type === 'true_false' ? ['True', 'False'] : undefined),
    correctAnswer: q.correctAnswer,
    explanation: q.explanation
  }));

  const newQuiz: Quiz = {
    id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,documentId,pipelineId,topicId,
    title: `${topic} Sniper Quiz`,
    subject: subject || topic,
    difficulty: diff,
    questions: formattedQuestions,
    totalQuestions: formattedQuestions.length,
    createdAt: new Date().toISOString()
  };

  db.get.quizzes.push(newQuiz);
  db.save();

  return res.json({ quiz: publicQuiz(newQuiz) });
});

// Submit Quiz score
router.post('/:id/submit', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const quizId = req.params.id;
  const { answers } = req.body;

  const quiz = db.get.quizzes.find(q => q.id === quizId && q.userId === userId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  maintainUser(userId);
  const attemptId=req.body.attemptId||createHash('sha256').update(JSON.stringify(Object.entries(answers).sort())+dayOf()).digest('hex');
  if(quiz.attempts?.some(a=>a.id===attemptId))return res.json({quiz});
  if (Object.keys(answers).some(id=>!quiz.questions.some(q=>q.id===id))) throw new HttpError(400,'Unknown question ID.');
  const normalize=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
  const score=Math.round(100*quiz.questions.filter(q=>normalize(answers[q.id]||'')===normalize(q.correctAnswer)).length/quiz.questions.length);
  quiz.score=score;
  quiz.completedAt=new Date().toISOString();
  quiz.attempts=[...(quiz.attempts||[]),{id:attemptId,score,answers,completedAt:quiz.completedAt}].slice(-50);
  const run=db.get.pipelines.find(p=>p.id===quiz.pipelineId&&p.userId===userId);
  if(run&&quiz.topicId&&recordResult(run,quiz.topicId,score,'quiz:'+quiz.id+':'+attemptId,'quiz')){
   const plan=db.get.studyPlans.find(p=>p.id===run.planId&&p.userId===userId);
   if(plan&&score<70)rebalance(plan,run,'Low quiz score',new Date(),quiz.topicId);
  }
  db.save();

  const updatedUser = touchUserStreak(userId);

  return res.json({ quiz, user: updatedUser });
});

// Delete quiz
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const quizId = req.params.id;

  const index = db.get.quizzes.findIndex(q => q.id === quizId && q.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.get.quizzes.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

export default router;
