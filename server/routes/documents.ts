import { Router, HttpError } from '../http.ts';
import { Response } from 'express';
import { db, Document } from '../db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { groundedAnswer, generateNoteSummaryJSON } from '../services/gemini.ts';

import { retrieve } from '../services/retrieval.ts';
const router = Router();

// Get list of user documents
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docs = db.get.documents
    .filter(d => d.userId === userId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return res.json({ documents: docs });
});

// Upload/Process Document (Accepts file metadata & extracted text payload)
router.post('/upload', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { fileName, fileType, fileSize, textContent } = req.body;

  if (!fileName || !textContent) {
    return res.status(400).json({ error: 'fileName and textContent are required' });
  }

  if (db.get.documents.filter(d => d.userId === userId).length >= 50) throw new HttpError(409,'Document limit reached (50). Delete unused documents first.');
  // Upload succeeds only after real extraction; use a clearly labeled source preview.
  let summary = 'Source preview (AI summary not configured): ' + textContent.slice(0,500);
  let warning: string | undefined;
  if(process.env.GEMINI_API_KEY) {
    try {const result=await generateNoteSummaryJSON({topic:fileName,content:textContent.slice(0,20000)});summary=(textContent.length>20000?'Summary of first 20,000 characters: ':'')+result.summary;}
    catch {warning='Document saved, but AI summary failed. The source text is available for retry.';summary='AI summary unavailable. Source preview: '+textContent.slice(0,500);}
  }

  const newDoc: Document = {
    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    fileName,
    fileType: fileType || 'TXT',
    fileSize: fileSize || textContent.length,
    extractedText: textContent,
    summary,
    keyTopics: [],
    uploadedAt: new Date().toISOString()
  };

  db.get.documents.push(newDoc);
  db.save();

  return res.json({ document: newDoc, warning });
});

// Ask question about uploaded document
router.post('/:id/ask', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docId = req.params.id;
  const { question } = req.body;

  const doc = db.get.documents.find(d => d.id === docId && d.userId === userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const result = await groundedAnswer(question, retrieve(doc.extractedText,question));
  return res.json({question,...result});
});

// Summarize or Explain selected section
router.post('/:id/explain-section', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docId = req.params.id;
  const { selectedText } = req.body;

  const doc = db.get.documents.find(d => d.id === docId && d.userId === userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!doc.extractedText.includes(selectedText)) throw new HttpError(400,'Selected text must come from this document.');
  const result = await groundedAnswer('Explain this excerpt', [{id:'selection',text:selectedText}]);
  return res.json({explanation:result.answer,citations:result.citations});
});

// Delete document
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docId = req.params.id;

  const index = db.get.documents.findIndex(d => d.id === docId && d.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  db.get.documents.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

export default router;
