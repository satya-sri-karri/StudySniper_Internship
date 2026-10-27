import {cardDue,reviewCard,dayOf} from '../services/learning.ts';
import {HttpError} from '../http.ts';
import { Router } from '../http.ts';
import { Response } from 'express';
import { db, Flashcard, touchUserStreak } from '../db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { generateFlashcardsJSON } from '../services/gemini.ts';

import { sourceForTopic } from '../services/retrieval.ts';
const router = Router();

// Get list of flashcards
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const flashcards = db.get.flashcards
    .filter(f => f.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ flashcards:flashcards.map(c=>({...c,nextReview:cardDue(c)})) });
});

// Generate Flashcards
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { topic, count, documentId } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const num = Number(count) || 6;
  const rawCards = await generateFlashcardsJSON({
    topic,
    documentText: sourceForTopic(userId, documentId, topic),
    count: num
  });

  const createdCards: Flashcard[] = [];

  for (const c of rawCards) {
    const card: Flashcard = {
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      deckTitle: topic,
      front: c.front || `What is ${topic}?`,
      back: c.back || `Definition and key attributes of ${topic}.`,
      difficulty: c.difficulty || 'medium',
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      createdAt: new Date().toISOString()
    };
    db.get.flashcards.push(card);
    createdCards.push(card);
  }

  db.save();
  return res.json({ flashcards: createdCards });
});

// Create manual Flashcard
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { deckTitle, front, back, difficulty } = req.body;

  if (!front || !back) {
    return res.status(400).json({ error: 'Front and back content are required' });
  }

  const card: Flashcard = {
    id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    deckTitle: deckTitle || 'General Knowledge',
    front,
    back,
    difficulty: difficulty || 'medium',
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    createdAt: new Date().toISOString()
  };

  db.get.flashcards.push(card);
  db.save();

  return res.json({ flashcard: card });
});

// Update review status (Spaced repetition rating: easy, good, hard, again)
router.put('/:id/review', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const cardId = req.params.id;
  const { rating } = req.body; // 'again', 'hard', 'good', 'easy'

  const card = db.get.flashcards.find(f => f.id === cardId && f.userId === userId);
  if (!card) {
    return res.status(404).json({ error: 'Flashcard not found' });
  }

  if(cardDue(card)>dayOf())throw new HttpError(409,'This card is not due yet. Browse it without changing the review schedule.');
  reviewCard(card,rating);

  db.save();
  const updatedUser = touchUserStreak(userId);
  return res.json({ flashcard: card, user: updatedUser });
});

// Delete flashcard
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const cardId = req.params.id;

  const index = db.get.flashcards.findIndex(f => f.id === cardId && f.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Flashcard not found' });
  }

  db.get.flashcards.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

export default router;
