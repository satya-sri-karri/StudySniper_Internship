import {config} from '../config.ts';
import { Router, HttpError } from '../http.ts';
import { Response } from 'express';
import { db, Chat, Message } from '../db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import {groundedAnswer} from '../services/ai.ts';
import {ownedDocument,retrieve} from '../services/retrieval.ts';

const router = Router();

// Get list of conversations
router.get('/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const userChats = db.get.chats
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return res.json({ chats: userChats });
});

// Create new conversation
router.post('/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { title } = req.body;

  const newChat: Chat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    title: title || 'New AI Tutor Session',
    model: config.aiModel,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get.chats.push(newChat);

  // Add initial system message or greeting
  const greetingMsg: Message = {
    id: 'msg_' + Date.now() + '_1',
    chatId: newChat.id,
    role: 'model',
    content: `Hello! I am **Sniper AI**, your dedicated personal tutor. 🎯\n\nHow can I help you master your studies today? Choose your uploaded syllabus or notes, then ask a specific question. I answer only from that source and show supporting excerpts.`,
    timestamp: new Date().toISOString()
  };
  db.get.messages.push(greetingMsg);
  db.save();

  return res.json({ chat: newChat, initialMessage: greetingMsg });
});

// Delete conversation
router.delete('/conversations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const chatId = req.params.id;

  const chatIndex = db.get.chats.findIndex(c => c.id === chatId && c.userId === userId);
  if (chatIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  db.get.chats.splice(chatIndex, 1);
  db.get.messages = db.get.messages.filter(m => m.chatId !== chatId);
  db.save();

  return res.json({ success: true });
});

// Get messages for a conversation
router.get('/conversations/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
  const chatId = req.params.id;
  if (!db.get.chats.some(c => c.id === chatId && c.userId === req.user!.userId)) throw new HttpError(404, 'Conversation not found.');
  const messages = db.get.messages
    .filter(m => m.chatId === chatId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return res.json({ messages });
});

// Send message & stream AI response via Server-Sent Events (SSE)
router.post('/message', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { chatId, prompt, documentId } = req.body;

  if (!chatId || !prompt) {
    return res.status(400).json({ error: 'chatId and prompt are required' });
  }

  const chat = db.get.chats.find(c => c.id === chatId && c.userId === userId);
  if (!chat) throw new HttpError(404, 'Conversation not found.');

  if(!documentId)throw new HttpError(400,'Choose an uploaded source for grounded answers.');
  const source=ownedDocument(userId,documentId);

  // Auto update title if first user message
  if (chat.title === 'New AI Tutor Session') {
    chat.title = prompt.length > 35 ? prompt.slice(0, 35) + '...' : prompt;
  }
  chat.updatedAt = new Date().toISOString();

  // Save User Message
  const userMsg: Message = {
    id: 'msg_' + Date.now() + '_u',
    chatId: chat.id,
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  };
  db.get.messages.push(userMsg);
  db.save();

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const controller = new AbortController();
  res.once('close', () => controller.abort());
  let fullAiText = '';
  try {
    const answer=await groundedAnswer(prompt,retrieve(source.extractedText,prompt));
    fullAiText=answer.answer+(answer.citations.length?'\n\n**Source: '+source.fileName+'**\n'+answer.citations.map(c=>'\n> '+c.quote.replace(/\n/g,' ')).join(''):'');
    if(!controller.signal.aborted)res.write(`data: ${JSON.stringify({chunk:fullAiText})}\n\n`);

    if (controller.signal.aborted || !db.get.chats.some(c => c.id === chat.id && c.userId === userId)) return;
    // Save final AI Message
    const aiMsg: Message = {
      id: 'msg_' + Date.now() + '_m',
      chatId: chat.id,
      role: 'model',
      content: fullAiText,
      timestamp: new Date().toISOString()
    };
    db.get.messages.push(aiMsg);
    db.save();

    res.write(`data: ${JSON.stringify({ done: true, messageId: aiMsg.id })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({error:err instanceof HttpError ? err.message : 'Response failed. Please retry.'})}\n\n`);
      res.end();
    }
  }
});

// Bookmark / Unbookmark message
router.post('/bookmark', authenticateToken, (req: AuthRequest, res: Response) => {
  const { messageId } = req.body;
  const msg = db.get.messages.find(m => m.id === messageId);
  if (!msg || !db.get.chats.some(c => c.id === msg.chatId && c.userId === req.user!.userId)) {
    return res.status(404).json({ error: 'Message not found' });
  }
  msg.bookmarked = !msg.bookmarked;
  db.save();
  return res.json({ bookmarked: msg.bookmarked });
});

export default router;
