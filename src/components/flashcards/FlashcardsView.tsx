import {LearningOverview} from '../dashboard/LearningOverview';
import { SourceSelect } from '../common/SourceSelect';
import { LoadState } from '../common/LoadState';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Flashcard } from '../../types';
import {
  Layers,
  Sparkles,
  RotateCw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Filter
} from 'lucide-react';

export const FlashcardsView: React.FC = () => {
  const { showToast, updateUser } = useAuth();

  const [documentId,setDocumentId]=useState('');
  const [dueOnly,setDueOnly]=useState(true),[reviewing,setReviewing]=useState(false);
  const [loadError,setLoadError]=useState('');
  const [initialLoading,setInitialLoading]=useState(true);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selected Deck filter ('ALL' or deckTitle)
  const [selectedDeck, setSelectedDeck] = useState<string>('ALL');

  // AI Generator state
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState(6);

  // Manual Card Creation
  const [manualOpen, setManualOpen] = useState(false);
  const [deckTitle, setDeckTitle] = useState('');
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');

  // 3D Player State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    setInitialLoading(true);setLoadError('');
    try {
      const res = await api.getFlashcards();
      setFlashcards(res.flashcards);
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load study data.');
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }

  const handleGenerateCards = async () => {
    if (!genTopic.trim() || !documentId || generating) return;
    setGenerating(true);

    try {
      const res = await api.generateFlashcards({
        topic: genTopic,
        documentId,
        count: genCount
      });
      setFlashcards(prev => [...res.flashcards, ...prev]);
      setSelectedDeck(genTopic.trim());
      setCurrentIndex(0);
      setIsFlipped(false);
      showToast(`Generated ${res.flashcards.length} flashcards for "${genTopic}"!`, 'success');
      setGenTopic('');
    } catch (e) {
      showToast((e as Error).message || 'Failed to generate flashcards.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManual = async () => {
    if (!frontText.trim() || !backText.trim()) return;
    try {
      const res = await api.createFlashcard({
        deckTitle: deckTitle.trim() || 'General Knowledge',
        front: frontText.trim(),
        back: backText.trim(),
        difficulty: 'medium'
      });
      setFlashcards(prev => [res.flashcard, ...prev]);
      setSelectedDeck(deckTitle.trim() || 'General Knowledge');
      setFrontText('');
      setBackText('');
      setDeckTitle('');
      setManualOpen(false);
      showToast('Flashcard created!', 'success');
    } catch (e) {
      showToast('Error creating card.', 'error');
    }
  };

  const handleReviewRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    const card = filteredCards[currentIndex];
    if (!card || reviewing) return;
    setReviewing(true);

    try {
      const res = await api.reviewFlashcard(card.id, rating);
      if (res.user) {
        updateUser(res.user);
      }
      setFlashcards(prev=>prev.map(c=>c.id===card.id?res.flashcard:c));
      setIsFlipped(false);
      if (dueOnly) {setCurrentIndex(0);} else if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
        showToast('Deck review session completed! ', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    } finally {setReviewing(false);}
  };

  const handleDeleteCard = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.deleteFlashcard(id);
      setFlashcards(prev => prev.filter(f => f.id !== id));
      if (currentIndex >= filteredCards.length - 1) {
        setCurrentIndex(Math.max(0, filteredCards.length - 2));
      }
      showToast('Card deleted.', 'info');
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    }
  };

  // Get unique deck titles
  const deckTitles = Array.from(new Set(flashcards.map(f => f.deckTitle))).filter(Boolean);

  // Filter cards by selected deck
  const filteredCards = flashcards.filter(f=>(selectedDeck==='ALL'||f.deckTitle===selectedDeck)&&(!dueOnly||!f.nextReview||f.nextReview<=new Date().toISOString().slice(0,10)));

  const currentCard = filteredCards[currentIndex];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <LoadState loading={initialLoading} error={loadError} retry={loadCards} />
      <LearningOverview reviews />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dueOnly} onChange={e=>{setDueOnly(e.target.checked);setCurrentIndex(0);setIsFlipped(false);}}/>Show only flashcards due today (UTC)</label>
      <p className="text-xs">{filteredCards.length} cards in this view. {currentCard?.nextReview&&`Current card due: ${currentCard.nextReview}`}</p>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-teal-500 dark:text-teal-400" /> AI Spaced-Repetition Flashcards
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Master definitions, key formulas, and terms using interactive 3D cards and fixed 1, 3, 7, 14 and 30-day review intervals.
          </p>
        </div>

        <button
          onClick={() => setManualOpen(true)}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4 text-teal-500 dark:text-teal-400" /> Custom Card
        </button>
      </div>

      {/* Manual Creation Modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg relative">
            <button
              onClick={() => setManualOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-500 dark:text-teal-400" /> Create Custom Flashcard
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Deck / Subject Name</label>
              <input
                type="text"
                value={deckTitle}
                onChange={e => setDeckTitle(e.target.value)}
                placeholder="e.g. Organic Chemistry, Neurobiology"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Front (Question / Term)</label>
              <textarea
                rows={2}
                value={frontText}
                onChange={e => setFrontText(e.target.value)}
                placeholder="e.g. What is the action potential threshold?"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Back (Answer / Explanation)</label>
              <textarea
                rows={3}
                value={backText}
                onChange={e => setBackText(e.target.value)}
                placeholder="e.g. Typically around -55mV, triggering voltage-gated Na+ channels..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setManualOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManual}
                disabled={!frontText.trim() || !backText.trim()}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition disabled:opacity-50"
              >
                Save Flashcard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Generator Box */}
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500 dark:text-teal-400" /> Generate AI Flashcard Deck
          </div>

          <SourceSelect value={documentId} onChange={setDocumentId} />
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Topic or Subject</label>
            <input
              type="text"
              value={genTopic}
              onChange={e => setGenTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateCards()}
              placeholder="e.g. Neurobiology, Python Data Structures"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Card Count ({genCount})</label>
            <input
              type="range"
              min="3"
              max="15"
              value={genCount}
              onChange={e => setGenCount(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <button
            onClick={handleGenerateCards}
            disabled={generating || !genTopic.trim() || !documentId}
            className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-lg  flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Flashcards'}
          </button>

          {/* Deck Filters list */}
          {deckTitles.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" /> Study Decks ({deckTitles.length})
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                <button
                  onClick={() => { setSelectedDeck('ALL'); setCurrentIndex(0); setIsFlipped(false); }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                    selectedDeck === 'ALL'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All Cards ({flashcards.length})
                </button>
                {deckTitles.map(deck => (
                  <button
                    key={deck}
                    onClick={() => { setSelectedDeck(deck); setCurrentIndex(0); setIsFlipped(false); }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition truncate max-w-[160px] ${
                      selectedDeck === deck
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {deck}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3D Card Reviewer (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500 dark:text-teal-400" /> Loading flashcards...
            </div>
          ) : filteredCards.length > 0 && currentCard ? (
            <div className="space-y-4">
              {/* Counter & Controls Header */}
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>
                    Card <strong className="text-teal-600 dark:text-teal-400">{currentIndex + 1}</strong> of {filteredCards.length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                    Deck: {currentCard.deckTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex(prev => (prev > 0 ? prev - 1 : filteredCards.length - 1));
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title="Previous Card"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex(prev => (prev < filteredCards.length - 1 ? prev + 1 : 0));
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title="Next Card"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteCard(currentCard.id, e)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 transition ml-2"
                    title="Delete Card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[18rem] rounded-xl cursor-pointer perspective-1000 group transition-transform duration-300 hover:scale-[1.01]"
              >
                <div
                  className={`w-full min-h-[18rem] rounded-xl p-8 bg-white dark:bg-slate-900 border-2 ${
                    isFlipped ? 'border-teal-500/50' : 'border-teal-500/40'
                  } shadow-sm flex flex-col justify-between items-center text-center transition-all duration-500 relative`}
                >
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    {isFlipped ? 'Back (Answer & Explanation)' : 'Front (Question / Concept)'}
                  </div>

                  <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white max-w-lg leading-relaxed my-auto py-4">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </div>

                  <div className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1 font-medium">
                    <RotateCw className="w-3.5 h-3.5 animate-spin-slow" /> Click card to flip
                  </div>
                </div>
              </div>

              {/* Spaced Repetition Rating Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button
                  disabled={reviewing || (!!currentCard?.nextReview && currentCard.nextReview>new Date().toISOString().slice(0,10))}
                          onClick={() => handleReviewRating('again')}
                  className="py-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 border border-rose-500/30 dark:border-rose-500/40 text-rose-600 dark:text-rose-300 font-bold text-xs transition"
                >
                  Again <span className="block text-[9px] font-normal text-rose-500 dark:text-rose-400">1 day</span>
                </button>
                <button
                  disabled={reviewing || (!!currentCard?.nextReview && currentCard.nextReview>new Date().toISOString().slice(0,10))}
                          onClick={() => handleReviewRating('hard')}
                  className="py-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-500/30 dark:border-amber-500/40 text-amber-600 dark:text-amber-300 font-bold text-xs transition"
                >
                  Hard <span className="block text-[9px] font-normal text-amber-500 dark:text-amber-400">1 day</span>
                </button>
                <button
                  disabled={reviewing || (!!currentCard?.nextReview && currentCard.nextReview>new Date().toISOString().slice(0,10))}
                          onClick={() => handleReviewRating('good')}
                  className="py-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 hover:bg-teal-500/20 dark:hover:bg-teal-500/30 border border-teal-500/30 dark:border-teal-500/40 text-teal-600 dark:text-teal-300 font-bold text-xs transition"
                >
                  Good <span className="block text-[9px] font-normal text-teal-500 dark:text-teal-400">{[1,3,7,14,30][Math.min(4,(currentCard.reviewStep??-1)+1)]} days</span>
                </button>
                <button
                  disabled={reviewing || (!!currentCard?.nextReview && currentCard.nextReview>new Date().toISOString().slice(0,10))}
                          onClick={() => handleReviewRating('easy')}
                  className="py-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold text-xs transition"
                >
                  Easy <span className="block text-[9px] font-normal text-emerald-500 dark:text-emerald-400">{[1,3,7,14,30][Math.min(4,(currentCard.reviewStep??-1)+1)]} days</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              {dueOnly ? 'No cards due in this view. Turn off the due filter to browse upcoming cards.' : selectedDeck !== 'ALL'
                ? `No flashcards in deck "${selectedDeck}". Select "All Cards" or generate a new deck.`
                : 'No flashcards found. Enter a topic on the left and click "Generate Flashcards" to start!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

