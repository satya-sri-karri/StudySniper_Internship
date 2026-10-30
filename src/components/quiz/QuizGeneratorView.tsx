import { SourceSelect } from '../common/SourceSelect';
import { LoadState } from '../common/LoadState';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api,fetchApi } from '../../services/api';
import { Quiz, QuizQuestion } from '../../types';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Award,
  ChevronRight,
  Loader2,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';

export const QuizGeneratorView: React.FC = () => {
  const { showToast, updateUser } = useAuth();

  const [documentId,setDocumentId]=useState('');
  const [link,setLink]=useState(''),[topicOptions,setTopicOptions]=useState<{key:string;name:string;documentId:string;label:string}[]>([]);
  useEffect(()=>{void fetchApi('/api/progress').then(r=>setTopicOptions(r.exams.flatMap((p:any)=>p.topics.map((t:any)=>({key:p.id+'/'+t.id,name:t.name,documentId:p.documentId,label:p.title+' / '+t.name}))))).catch(()=>showToast('Could not load mastery topics. Standalone quizzes remain available.','error'));},[]);
  const [loadError,setLoadError]=useState('');
  const [initialLoading,setInitialLoading]=useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);

  // Form parameters
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'true_false']);

  // Active Quiz Playing State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitting,setSubmitting]=useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    setInitialLoading(true);setLoadError('');
    try {
      const res = await api.getQuizzes();
      setQuizzes(res.quizzes);
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load study data.');
    } finally {setInitialLoading(false);}
  }

  const handleToggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(prev => prev.filter(t => t !== type));
      }
    } else {
      setSelectedTypes(prev => [...prev, type]);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim() || !documentId) {
      showToast('Please enter a topic and choose a source document.', 'error');
      return;
    }
    setLoading(true);

    try {
      const res = await api.generateQuiz({
        topic,
        documentId,...(link?{pipelineId:link.split('/')[0],topicId:link.split('/')[1]}:{}),
        subject: subject || topic,
        difficulty,
        questionCount,
        types: selectedTypes
      });

      setQuizzes(prev => [res.quiz, ...prev]);
      startPlayingQuiz(res.quiz);
      showToast('Quiz generated successfully!', 'success');
    } catch (e) {
      showToast((e as Error).message || 'Quiz generation failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startPlayingQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSubmitted(false);
    setFinalScore(null);
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    if(submitting) return;
    setSubmitting(true);
    try {
      const res=await api.submitQuizScore(activeQuiz.id,userAnswers);
      const scorePercentage=res.quiz.score;
      setFinalScore(scorePercentage);setSubmitted(true);setActiveQuiz(res.quiz);
      setQuizzes(prev=>prev.map(q=>q.id===res.quiz.id?res.quiz:q));
      if (res.user) {
        updateUser(res.user);
      }
      // Trigger confetti explosion on high score
      if (scorePercentage >= 70) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      showToast(`Quiz completed! Score: ${scorePercentage}%`, 'success');
    } catch (error:any) { showToast(error.message || 'Result could not be saved. Retry submission.','error'); }
    finally {setSubmitting(false);}

  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteQuiz(id);
      setQuizzes(prev => prev.filter(q => q.id !== id));
      if (activeQuiz?.id === id) {
        setActiveQuiz(null);
      }
      showToast('Quiz deleted.', 'info');
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <LoadState loading={initialLoading} error={loadError} retry={loadQuizzes} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-amber-500 dark:text-amber-400" /> Practice quizzes
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Aucustom MCQs, True/False, and short answer quizzes to test active recall.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Form / History Sidebar */}
        <div className="space-y-6">
          {/* Generator Card */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Generate New Quiz
            </div>

            <SourceSelect value={documentId} onChange={id=>{setDocumentId(id);setLink('');}} />
            <label className="block text-xs">Track mastery (optional)<select className="block w-full rounded-xl p-2 bg-slate-800" value={link} onChange={e=>{setLink(e.target.value);const option=topicOptions.find(o=>o.key===e.target.value);if(option){setTopic(option.name);setDocumentId(option.documentId);}}}><option value="">Standalone quiz — no topic mapping</option>{topicOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
          <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Topic or Concept</label>
              <input
                type="text"
                value={topic}
                onChange={e => {setTopic(e.target.value);setLink('');}}
                placeholder="e.g. Organic Chemistry Reactions, Big-O Notation"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:border-amber-500 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 text-xs font-semibold rounded-xl uppercase tracking-wider transition ${
                      difficulty === d
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Questions ({questionCount})</label>
              <input
                type="range"
                min="3"
                max="15"
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Question Formats</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'mcq', label: 'Multiple Choice' },
                  { id: 'true_false', label: 'True / False' },
                  { id: 'fill_in_blank', label: 'Fill in Blank' },
                  { id: 'short_answer', label: 'Short Answer' }
                ].map(type => {
                  const selected = selectedTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleToggleType(type.id)}
                      className={`p-2 rounded-xl border text-[11px] font-medium transition flex items-center justify-between ${
                        selected
                          ? 'bg-teal-50 dark:bg-teal-600/20 border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{type.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={loading || !topic.trim() || !documentId}
              className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-lg  flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate AI Quiz'}
            </button>
          </div>

          {/* Saved Quizzes History */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">Saved Quizzes</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {quizzes.map(q => (
                <div
                  key={q.id}
                  onClick={() => startPlayingQuiz(q)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between group ${
                    activeQuiz?.id === q.id
                      ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-200">{q.title}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                      {q.difficulty} • {q.totalQuestions} Questions
                      {q.score !== undefined && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2">Score: {q.score}%</span>}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDeleteQuiz(q.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Quiz Player (2 cols) */}
        <div className="lg:col-span-2">
          {activeQuiz ? (
            <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden shadow-sm">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
                    {activeQuiz.difficulty} Difficulty
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{activeQuiz.title}</h2>
                </div>

                {finalScore !== null && (
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{finalScore}%</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Final Result</div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`
                  }}
                />
              </div>

              {/* Current Question */}
              {activeQuiz.questions[currentQuestionIndex] && (
                <div className="space-y-6">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {activeQuiz.questions[currentQuestionIndex].question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {['short_answer','fill_in_blank'].includes(activeQuiz.questions[currentQuestionIndex].type) && <label className="block text-sm">Your answer<input aria-label="Your answer" disabled={submitted || submitting} value={userAnswers[activeQuiz.questions[currentQuestionIndex].id] || ''} onChange={e=>handleSelectOption(activeQuiz.questions[currentQuestionIndex].id,e.target.value)} className="block w-full rounded-xl p-3 mt-2 bg-slate-100 dark:bg-slate-800" /><span className="text-xs">Use the precise term from the notes. Step 2 uses normalized exact-match grading.</span></label>}
                    {(activeQuiz.questions[currentQuestionIndex].options || []).map((opt, idx) => {
                      const qId = activeQuiz.questions[currentQuestionIndex].id;
                      const selected = userAnswers[qId] === opt;
                      const isCorrect = opt === activeQuiz.questions[currentQuestionIndex].correctAnswer;

                      let optStyle = 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';
                      if (selected) optStyle = 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200 font-semibold';

                      if (submitted) {
                        if (isCorrect) optStyle = 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                        else if (selected && !isCorrect) optStyle = 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(qId, opt)}
                          disabled={submitted}
                          className={`w-full p-4 rounded-lg border text-xs sm:text-sm text-left transition flex items-center justify-between ${optStyle}`}
                        >
                          <span>{opt}</span>
                          {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                          {submitted && selected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Solution Explanation if submitted */}
                  {submitted && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-1">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Explanation:</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        Correct answer: {activeQuiz.questions[currentQuestionIndex].correctAnswer}<br />{activeQuiz.questions[currentQuestionIndex].explanation}
                      </div>
                    </div>
                  )}

                  {/* Question Nav Controls */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md "
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      !submitted && (
                        <button
                          disabled={submitting}
                          onClick={handleSubmitQuiz}
                          className="px-6 py-2 rounded-xl bg-teal-700 text-white font-black text-xs shadow-lg "
                        >
                          {submitting ? 'Saving result…' : 'Submit Quiz'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Generate or select a quiz from the left sidebar to start practicing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
