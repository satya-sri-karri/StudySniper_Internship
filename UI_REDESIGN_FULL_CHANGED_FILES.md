# Interface redesign — complete changed source

Reports are excluded from this snapshot to avoid recursion.

## /workspace/scratch/3acea0dbcacf/study-sniper/src/App.tsx

Use the warm neutral workspace background and teal loading/selection styling.

````
import {DemoGuide} from './components/dashboard/DemoGuide';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import React, { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { Toast } from './components/common/Toast';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';

// Tab Views
const DashboardOverview=lazy(()=>import('./components/dashboard/DashboardOverview').then(module=>({default:module.DashboardOverview})));
const AiTutorView=lazy(()=>import('./components/tutor/AiTutorView').then(module=>({default:module.AiTutorView})));
const DocumentsView=lazy(()=>import('./components/documents/DocumentsView').then(module=>({default:module.DocumentsView})));
const QuizGeneratorView=lazy(()=>import('./components/quiz/QuizGeneratorView').then(module=>({default:module.QuizGeneratorView})));
const FlashcardsView=lazy(()=>import('./components/flashcards/FlashcardsView').then(module=>({default:module.FlashcardsView})));
const StudyPlannerView=lazy(()=>import('./components/planner/StudyPlannerView').then(module=>({default:module.StudyPlannerView})));
const NotesView=lazy(()=>import('./components/notes/NotesView').then(module=>({default:module.NotesView})));
const CodingAssistantView=lazy(()=>import('./components/coding/CodingAssistantView').then(module=>({default:module.CodingAssistantView})));
const SettingsView=lazy(()=>import('./components/settings/SettingsView').then(module=>({default:module.SettingsView})));

const MainLayout: React.FC = () => {
  const { isAuthenticated, activeTab, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Loading Study Sniper AI...</span>
        </div>
      </div>
    );
  }

  // Show Landing Page if user is not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage />
        <AuthModal />
        <Toast />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-teal-500 selection:text-white transition-colors duration-200">
      {/* Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Right Main Column */}
      <div className="min-w-0 flex-1 lg:pl-64 flex flex-col min-h-screen transition-all">
        {/* Top Header Navigation */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Dashboard Content Container */}
        <main className="min-w-0 flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="mb-4"><DemoGuide /></div>
          <Suspense fallback={<p role="status">Loading study tool…</p>}>
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'tutor' && <AiTutorView />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'flashcards' && <FlashcardsView />}
          {activeTab === 'quiz' && <QuizGeneratorView />}
          {activeTab === 'planner' && <StudyPlannerView />}
          {activeTab === 'documents' && <DocumentsView />}
          {activeTab === 'coding' && <CodingAssistantView />}
          {activeTab === 'settings' && <SettingsView />}
          </Suspense>
        </main>
      </div>

      {/* Global Search Popover Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Auth Modal & Toasts */}
      <AuthModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary><MainLayout /></ErrorBoundary>
    </AuthProvider>
  );
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/auth/AuthModal.tsx

Remove glow effects and unsupported Enterprise branding, use solid actions and label the close control.

````
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { OtpInput } from './OtpInput';
import { auth, googleProvider, formatFirebaseError, firebaseEnabled } from '../../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Loader2,
  Target,
  Key,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Flame
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    pendingEmail,
    setPendingEmail,
    login,
    showToast
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Cooldown timer state for resending OTP
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const [demoEnabled,setDemoEnabled]=useState(false);
  useEffect(()=>{api.authConfig().then(r=>setDemoEnabled(r.demo)).catch(()=>{});},[]);
  if (!authModalOpen) return null;

  const currentEmail = pendingEmail || email;

  const handleGoogleSignIn = async () => {
    if(!auth) return;
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (fbUser.email) {
        const res = await api.firebaseLogin(await fbUser.getIdToken(true));
        login(res.token, res.user);
        showToast(`Signed in via Firebase Google Auth as ${res.user.name}!`, 'success');
      } else {
        setError('Google Sign-In did not return an email address.');
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (authModalMode === 'login') {
        const res=await api.login({email,password});
        login(res.token,res.user);
      } else if (authModalMode === 'signup') {
        const res=await api.signup({name,email,password});
        setPendingEmail(res.email);setOtpCode('');setAuthModalMode('verify_otp');setCooldown(60);
        showToast(res.message,'info');
      } else if (authModalMode === 'verify_otp') {
        if (otpCode.length !== 6) {
          setError('Please enter the full 6-digit verification code.');
          setLoading(false);
          return;
        }
        const res = await api.verifyOtp({ email: currentEmail, otpCode, purpose: 'email_verification' });
        login(res.token, res.user);
      } else if (authModalMode === 'forgot') {
        const res = await api.forgotPassword({ email });
        setPendingEmail(email);

        setAuthModalMode('reset_password');
        setCooldown(60);
        showToast(res.message, 'info');
      } else if (authModalMode === 'reset_password') {
        if (otpCode.length !== 6) {
          setError('Please enter the 6-digit verification code.');
          setLoading(false);
          return;
        }
        await api.resetPassword({
          email: currentEmail,
          otpCode,
          newPassword
        });
        showToast('Password reset successful! Please sign in with your new password.', 'success');
        setAuthModalMode('login');
        setPassword('');
        setOtpCode('');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check inputs.');
      if (err.requiresVerification && err.email) {
        setPendingEmail(err.email);

        setAuthModalMode('verify_otp');
        setCooldown(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (purpose: 'email_verification' | 'password_reset' = 'email_verification') => {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const res = await api.resendOtp({ email: currentEmail, purpose });

      setCooldown(60);
      setSuccessMsg('A new 6-digit verification code has been dispatched to your email.');
      showToast('Verification code resent successfully.', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);setError('');
    try {const res=await api.demoLogin();login(res.token,res.user);}
    catch(error:any) {setError(error.message || 'Demo could not be opened.');}
    finally {setLoading(false);}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/60 rounded-xl shadow-lg p-6 sm:p-8 relative overflow-hidden my-8">
        {/* Close button */}
        <button
          aria-label="Close sign in"
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-lg ">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base text-white flex items-center gap-1.5">
              StudySniper.
            </div>
            <div className="text-xs text-slate-400">Your study workspace</div>
          </div>
        </div>

        {/* Mode Switcher Tabs for Login/Signup */}
        {(authModalMode === 'login' || authModalMode === 'signup') && (
          <>
            <button
              type="button"
              hidden={!firebaseEnabled}
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mb-4 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-slate-100 font-semibold text-xs flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer hover:border-teal-500/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google (Firebase Auth)</span>
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-semibold">Or email & password</span></div>
            </div>

            <div className="flex p-1 bg-slate-950/60 rounded-lg mb-6 border border-slate-800">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                  authModalMode === 'login'
                    ? 'bg-teal-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                  authModalMode === 'signup'
                    ? 'bg-teal-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          </>
        )}

        {/* Mode Title Headers */}
        {authModalMode === 'verify_otp' && (
          <div className="mb-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Verify Your Email</h3>
            <p className="text-xs text-slate-400 mt-1">
              We dispatched a 6-digit verification code to{' '}
              <strong className="text-teal-300">{currentEmail}</strong>
            </p>
          </div>
        )}

        {authModalMode === 'forgot' && (
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-100">Reset Password</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your registered email address to receive a secure 6-digit OTP reset code.
            </p>
          </div>
        )}

        {authModalMode === 'reset_password' && (
          <div className="mb-5 text-center">
            <h3 className="text-lg font-bold text-slate-100">Set New Password</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter the 6-digit OTP code sent to <strong className="text-teal-300">{currentEmail}</strong> and your new password.
            </p>
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}

        {/* OTP Mail Status Banner */}
        {(authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
          <div className="mb-4 p-3.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs space-y-2 backdrop-blur-md">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-teal-300">OTP Sent to Mail</div>
                <div className="text-[11px] text-teal-200/80 leading-snug mt-0.5">
                  A 6-digit verification code was dispatched to <strong className="text-white">{currentEmail}</strong>. Please check your inbox or spam folder.
                </div>
              </div>
            </div>


          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {(authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'forgot') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {/* OTP Code Input Boxes */}
          {(authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 text-center mb-1">
                Enter 6-Digit Verification Code
              </label>
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(code) => setOtpCode(code)}
                disabled={loading}
              />
            </div>
          )}

          {/* Password Input & Password Strength Meter */}
          {(authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'reset_password') && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  {authModalMode === 'reset_password' ? 'New Password' : 'Password'}
                </label>
                {authModalMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('forgot');
                      setError('');
                    }}
                    className="text-[11px] text-teal-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authModalMode === 'reset_password' ? newPassword : password}
                  onChange={e => {
                    if (authModalMode === 'reset_password') {
                      setNewPassword(e.target.value);
                    } else {
                      setPassword(e.target.value);
                    }
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter for Signup & Reset */}
              {(authModalMode === 'signup' || authModalMode === 'reset_password') && (
                <PasswordStrengthMeter
                  password={authModalMode === 'reset_password' ? newPassword : password}
                  name={name}
                  email={currentEmail}
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-lg  flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {authModalMode === 'login' && 'Sign In to Dashboard'}
                {authModalMode === 'signup' && 'Create Account & Sign In'}
                {authModalMode === 'verify_otp' && 'Confirm Code & Access App'}
                {authModalMode === 'forgot' && 'Send 6-Digit Reset Code'}
                {authModalMode === 'reset_password' && 'Reset Password & Sign In'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Resend OTP button & timer */}
        {(authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs">
            <div className="text-slate-400 mb-2">Didn&apos;t receive the code?</div>
            <button
              type="button"
              disabled={cooldown > 0 || resending}
              onClick={() => handleResendOtp(authModalMode === 'reset_password' ? 'password_reset' : 'email_verification')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-teal-300 font-semibold disabled:opacity-50 text-xs border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Verification Code'}
            </button>
          </div>
        )}

        {/* Back navigation buttons */}
        {(authModalMode === 'forgot' || authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
          <button
            onClick={() => {
              setAuthModalMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className="w-full mt-3 text-center text-xs text-slate-400 hover:text-white"
          >
            ← Back to Sign In
          </button>
        )}

        {/* Instant Demo Shortcut */}
        {demoEnabled && (authModalMode === 'login' || authModalMode === 'signup') && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-medium">Or instant demo</span></div>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" /> Open isolated demo account
            </button>
          </>
        )}
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/auth/OtpInput.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value = '',
  onChange,
  onComplete,
  disabled = false
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first empty box or box 0 on mount
    const firstEmpty = digits.findIndex(d => !d);
    const targetIdx = firstEmpty !== -1 ? firstEmpty : 0;
    inputRefs.current[targetIdx]?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;

    // Take last entered character if multiple typed
    const char = val[val.length - 1];

    const newDigits = [...digits];
    newDigits[idx] = char;
    const combined = newDigits.join('');

    onChange(combined);

    if (combined.length === 6 && onComplete) {
      onComplete(combined);
    } else if (idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[idx]) {
        newDigits[idx] = '';
        onChange(newDigits.join(''));
      } else if (idx > 0) {
        newDigits[idx - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    onChange(pasted);
    if (pasted.length === 6 && onComplete) {
      onComplete(pasted);
    }
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 my-4" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx]}
          disabled={disabled}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          className={`w-11 h-13 text-center text-xl font-bold rounded-xl transition-all outline-none shadow-sm ${
            digits[idx]
              ? 'bg-teal-500/20 text-teal-200 border-2 border-teal-500 '
              : 'bg-slate-900/70 text-white border border-slate-700/60 focus:border-teal-400 focus:bg-slate-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500'}`}
        />
      ))}
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/auth/PasswordStrengthMeter.tsx

Use solid semantic strength bars and retain all password requirements.

````
import React from 'react';
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
  name?: string;
  email?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  name = '',
  email = ''
}) => {
  if (!password) return null;

  const minLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  // Check personal/common
  let notPersonal = true;
  if (email && email.includes('@')) {
    const emailPrefix = email.split('@')[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
      notPersonal = false;
    }
  }
  if (name) {
    const parts = name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
    for (const p of parts) {
      if (password.toLowerCase().includes(p)) {
        notPersonal = false;
        break;
      }
    }
  }

  // Common simple checks
  const cleanPass = password.toLowerCase().replace(/[^a-z0-9]/g, '');
  const notCommon = !cleanPass.startsWith('password') && !cleanPass.startsWith('12345678') && cleanPass !== 'admin12345678';

  // Calculate score
  let score = 0;
  if (minLength) score += 25;
  if (hasUppercase) score += 15;
  if (hasLowercase) score += 15;
  if (hasNumber) score += 15;
  if (hasSpecial) score += 15;
  if (notCommon) score += 7.5;
  if (notPersonal) score += 7.5;

  score = Math.min(100, Math.round(score));

  let label: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  let barGradient = 'bg-rose-500';

  if (score >= 90) {
    label = 'Strong';
    badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    barGradient = 'bg-emerald-500';
  } else if (score >= 70) {
    label = 'Good';
    badgeBg = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    barGradient = 'bg-teal-500';
  } else if (score >= 45) {
    label = 'Fair';
    badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    barGradient = 'bg-amber-500';
  }

  const requirements = [
    { label: 'At least 12 characters', valid: minLength },
    { label: 'Uppercase (A-Z) & Lowercase (a-z)', valid: hasUppercase && hasLowercase },
    { label: 'At least one number (0-9)', valid: hasNumber },
    { label: 'At least one special symbol (!@#$)', valid: hasSpecial },
    { label: 'Not common & not containing name/email', valid: notCommon && notPersonal }
  ];

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-slate-900/60 dark:bg-slate-950/60 border border-slate-800 backdrop-blur-md space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          {score >= 90 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : score >= 45 ? (
            <Shield className="w-4 h-4 text-teal-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          )}
          <span>Password Strength</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeBg}`}>
          {label} ({score}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${barGradient} transition-all duration-300 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {requirements.map((req, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              req.valid ? 'text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            {req.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/coding/CodingAssistantView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Code2,
  Sparkles,
  Bug,
  Zap,
  BookOpen,
  Copy,
  Check,
  Loader2,
  Play
} from 'lucide-react';

export const CodingAssistantView: React.FC = () => {
  const { showToast } = useAuth();

  const [language, setLanguage] = useState('python');
  const [action, setAction] = useState<'explain' | 'debug' | 'optimize' | 'examples'>('explain');
  const [code, setCode] = useState(`def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`);

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const languages = [
    { id: 'python', name: 'Python' },
    { id: 'cpp', name: 'C++' },
    { id: 'java', name: 'Java' },
    { id: 'javascript', name: 'JavaScript' }
  ];

  const actions = [
    { id: 'explain', label: 'Explain Code', icon: BookOpen, desc: 'Line-by-line concept breakdown' },
    { id: 'debug', label: 'Debug & Fix', icon: Bug, desc: 'Locate bugs & edge case failures' },
    { id: 'optimize', label: 'Big-O Optimize', icon: Zap, desc: 'Time & space complexity enhancement' },
    { id: 'examples', label: 'Practice Problems', icon: Sparkles, desc: 'Generate 2 practice exercises' }
  ] as const;

  const handleAnalyze = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);

    try {
      const res = await api.analyzeCode({
        code,
        language,
        action
      });
      setAnalysisResult(res.response);
      showToast(`Completed ${action} analysis!`, 'success');
    } catch (e) {
      showToast('Code analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Analysis copied to clipboard.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Code2 className="w-6 h-6 text-teal-400" /> Multi-Language Code Lab & Assistant
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Master C++, Java, Python, and JavaScript with line-by-line explanations, bug fixes, and Big-O complexity analysis.
        </p>
      </div>

      {/* Action Tabs & Language Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap gap-2">
          {actions.map(act => {
            const Icon = act.icon;
            const isActive = action === act.id;
            return (
              <button
                key={act.id}
                onClick={() => setAction(act.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-md '
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Language:</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            {languages.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Input Area */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Source Code Input</span>
              <span className="text-[10px] text-teal-400 font-mono font-semibold">{language.toUpperCase()}</span>
            </div>

            <textarea
              rows={14}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Paste or write code here..."
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-teal-300 focus:border-teal-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !code.trim()}
            className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-lg  flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Run AI Code {actions.find(a => a.id === action)?.label}
              </>
            )}
          </button>
        </div>

        {/* AI Output Display Area */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" /> AI Tutor Code Analysis
              </span>

              {analysisResult && (
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Output'}
                </button>
              )}
            </div>

            {analysisResult ? (
              <div className="markdown-body p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed max-h-96 overflow-y-auto">
                <Markdown>{analysisResult}</Markdown>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 text-xs gap-2">
                <Code2 className="w-8 h-8 text-slate-600" />
                <span>Click &quot;Run AI Code Analysis&quot; to generate explanations, Big-O metrics, or debugged code.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/common/GlobalSearchModal.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Search, X, FileText, MessageSquare, Layers, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Note, Document, Chat, Flashcard } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { setActiveTab, setActiveChatId } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    notes: Note[];
    documents: Document[];
    chats: Chat[];
    flashcards: Flashcard[];
  }>({ notes: [], documents: [], chats: [], flashcards: [] });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ notes: [], documents: [], chats: [], flashcards: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query);
        setResults(res.results);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (tab: any, chatId?: string) => {
    if (chatId) setActiveChatId(chatId);
    setActiveTab(tab);
    onClose();
  };

  const hasResults =
    results.notes.length > 0 ||
    results.documents.length > 0 ||
    results.chats.length > 0 ||
    results.flashcards.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-teal-500/20 rounded-lg shadow-lg overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <Search className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, documents, chats, flashcards... (Cmd+K)"
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none"
            autoFocus
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">ESC</span>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Type to search across your notes, uploaded documents, AI tutor chats, and study flashcards.
            </div>
          )}

          {query && !loading && !hasResults && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No matching resources found for &quot;<span className="text-teal-600 dark:text-teal-400 font-medium">{query}</span>&quot;
            </div>
          )}

          {/* Notes */}
          {results.notes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Notes
              </div>
              <div className="space-y-1">
                {results.notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => navigateTo('notes')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-teal-500/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300">{note.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{note.summary}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {results.documents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Documents
              </div>
              <div className="space-y-1">
                {results.documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => navigateTo('documents')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-teal-500/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300">{doc.fileName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chats */}
          {results.chats.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> AI Tutor Chats
              </div>
              <div className="space-y-1">
                {results.chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => navigateTo('tutor', chat.id)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-teal-500/30 transition-all flex items-center justify-between group"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300">{chat.title}</div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flashcards */}
          {results.flashcards.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Flashcards
              </div>
              <div className="space-y-1">
                {results.flashcards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => navigateTo('flashcards')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-300">{card.front}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{card.back}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
          <span>Study Sniper AI Global Index</span>
          <button onClick={onClose} className="hover:text-slate-900 dark:hover:text-slate-300">Close</button>
        </div>
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/common/Header.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import {fetchApi} from '../../services/api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Clock,
  Menu,
  User as UserIcon,
  LogOut,
  Trash2,
  Flame,
  Award,
  Sparkles,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenSearch }) => {
  const { user, darkMode, toggleDarkMode, logout, deleteAccount, setActiveTab, setAuthModalOpen, setAuthModalMode } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Study timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setStudySeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Notifications state
  const [notifications, setNotifications] = useState<{id:string;title:string;message:string;read:boolean}[]>([]);

  const [notificationError,setNotificationError]=useState('');
  useEffect(()=>{
    let active=true;setNotifications([]);
    const load=async()=>{if(!user)return;try{const r=await fetchApi('/api/progress/notifications');if(active){setNotifications(r.notifications);setNotificationError('');}}catch{if(active)setNotificationError('Could not refresh reminders.');}};
    void load();const timer=setInterval(()=>void load(),60000);const refresh=()=>void load();window.addEventListener('studysniper-progress-changed',refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('studysniper-progress-changed',refresh);};
  },[user?.id]);
  const markRead=async(ids:string[])=>{try{for(let i=0;i<ids.length;i+=200)await fetchApi('/api/progress/notifications/read',{method:'PUT',body:JSON.stringify({ids:ids.slice(i,i+200)})});setNotifications(prev=>prev.filter(n=>!ids.includes(n.id)));}catch{setNotificationError('Could not dismiss reminders. Please retry.');}};
  const markAllNotificationsRead=()=>void markRead(notifications.map(n=>n.id));
  const dismissNotification=(id:string)=>void markRead([id]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 hover:border-teal-500/40 text-slate-500 dark:text-slate-400 text-xs transition w-64 lg:w-80 group"
        >
          <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
          <span className="flex-1 text-left">Search notes, docs, chats...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400">⌘K</kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Study Session Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-slate-900 border border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>{formatTimer(studySeconds)}</span>
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="p-1 hover:text-teal-900 dark:hover:text-white transition"
            title={timerRunning ? 'Pause Session' : 'Start Session'}
          >
            {timerRunning ? <Pause className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
          </button>
          {studySeconds > 0 && (
            <button
              onClick={() => {
                setTimerRunning(false);
                setStudySeconds(0);
              }}
              className="p-0.5 hover:text-rose-500 transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-teal-600" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-teal-500/20 rounded-lg shadow-lg p-4 z-50 animate-slide-down">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-teal-400" /> Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notificationError&&<p role="alert" className="text-xs text-rose-300">{notificationError}</p>}
              {notifications.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6 italic">
                  You’re caught up. New study and review reminders appear here while the app is open.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium text-teal-300">{n.title}</div>
                        <div className="text-slate-400 mt-0.5">{n.message}</div>
                      </div>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 shrink-0 transition"
                        title="Dismiss notification"
                      >
                        
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-white font-semibold text-xs shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-xs font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-teal-500/20 rounded-lg shadow-lg p-3 z-50 animate-slide-down">
                <div className="p-2 border-b border-slate-800 mb-2">
                  <div className="font-medium text-sm text-slate-100">{user.name}</div>
                  <div className="text-xs text-slate-400 truncate">{user.email}</div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                      <Flame className="w-4 h-4 fill-amber-400 text-amber-400" /> {user.streakDays ?? 1} Day Streak
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-teal-400" /> Account Settings
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalMode('signup');
                setAuthModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-700 shadow-md  transition"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/common/Sidebar.tsx

Group navigation by study work and source material, with restrained active states and accessible mobile controls.

````
import {useAuth} from '../../context/AuthContext';
import type {TabType} from '../../types';
import {LayoutDashboard,BookOpen,FileText,Layers,ClipboardCheck,CalendarDays,FolderOpen,Code2,Settings,Target,X,ArrowUpRight} from 'lucide-react';
const groups=[{label:'YOUR STUDY DESK',items:[{id:'dashboard',label:'Dashboard',icon:LayoutDashboard},{id:'planner',label:'Study Planner',icon:CalendarDays},{id:'flashcards',label:'Revision Engine',icon:Layers},{id:'quiz',label:'Quiz Generator',icon:ClipboardCheck}]},{label:'YOUR MATERIAL',items:[{id:'documents',label:'Upload Documents',icon:FolderOpen},{id:'notes',label:'My Notes',icon:FileText},{id:'tutor',label:'AI Tutor',icon:BookOpen},{id:'coding',label:'Coding Assistant',icon:Code2}]}] as const;
export function Sidebar({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}){
 const {activeTab,setActiveTab,user}=useAuth();const go=(tab:TabType)=>{setActiveTab(tab);onClose();};
 return <>{isOpen&&<button aria-label="Close sidebar overlay" onClick={onClose} className="fixed inset-0 z-40 bg-black/35 lg:hidden"/>}<aside className={`study-sidebar ${isOpen?'is-open':''}`}><div className="sidebar-brand"><button onClick={()=>go('dashboard')} className="wordmark"><Target size={24}/><span>StudySniper.</span></button><button aria-label="Close navigation" onClick={onClose} className="lg:hidden"><X size={20}/></button></div><nav aria-label="Study navigation" className="sidebar-nav">{groups.map(g=><div key={g.label} className="nav-group"><p>{g.label}</p>{g.items.map(item=><button key={item.id} aria-current={activeTab===item.id?'page':undefined} className={activeTab===item.id?'nav-link active':'nav-link'} onClick={()=>go(item.id)}><item.icon size={18}/><span>{item.label}</span>{activeTab===item.id&&<span className="nav-active-dot"/>}</button>)}</div>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="eyebrow">KEEP SHOWING UP</span><strong>{user?.streakDays??0} day study streak</strong><p>A little progress is still progress.</p></div><button className={activeTab==='settings'?'nav-link active':'nav-link'} onClick={()=>go('settings')}><Settings size={18}/>Settings<ArrowUpRight size={15} className="ml-auto"/></button></div></aside></>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/common/SkeletonLoader.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import React from 'react';

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-800/60 border border-slate-800 rounded-lg w-full" />
      ))}
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/common/Toast.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useAuth();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div role={isError ? "alert" : "status"} className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-up bg-slate-900/95 border-teal-500/30 text-white">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-teal-400 shrink-0" />}
      
      <span className="text-sm font-medium pr-2">{toast.message}</span>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/dashboard/DashboardOverview.tsx

Replace the gradient hero and colorful cards with a study desk, metric strip, readiness section and quiet activity chart.

````
import {useEffect,useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import {api} from '../../services/api';
import type {DashboardStats,WeeklyProgressItem,TabType} from '../../types';
import {ArrowRight,ArrowUpRight,BookOpen,FolderOpen,Layers,CalendarDays} from 'lucide-react';
import {LearningOverview} from './LearningOverview';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid} from 'recharts';
export function DashboardOverview(){
 const {user,setActiveTab}=useAuth();const [stats,setStats]=useState<DashboardStats|null>(null),[weekly,setWeekly]=useState<WeeklyProgressItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');api.getStats().then(r=>{if(active){setStats(r.stats);setWeekly(r.weeklyProgress||[]);}}).catch(()=>{if(active)setError('Could not load your activity. Please retry.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[reload]);
 const tools=[{tab:'planner',title:'Make a plan',text:'Turn your syllabus into a realistic week.',icon:CalendarDays},{tab:'tutor',title:'Work through a question',text:'Get explanations from your own material.',icon:BookOpen},{tab:'documents',title:'Bring your notes',text:'Keep your course material in one place.',icon:FolderOpen},{tab:'flashcards',title:'Revisit a topic',text:'A short review now. Less relearning later.',icon:Layers}] as const;
 const metrics=[{label:'Study streak',value:user?.streakDays??stats?.streakDays??0,unit:'days',note:'Consecutive active days'},{label:'Study time',value:stats?.hoursStudied??0,unit:'hrs',note:'Estimated from your activity'},{label:'Quizzes completed',value:stats?.completedQuizzesCount??0,unit:'',note:`Average score: ${stats?.averageQuizScore??0}%`},{label:'Cards reviewed',value:stats?.flashcardsReviewedCount??0,unit:'',note:'Recorded review activity'}];
 return <div className="dashboard-layout"><section className="desk-heading"><div><p className="eyebrow">YOUR STUDY DESK</p><h1>A clear head.<br/><span>A plan for what’s next.</span></h1><p>Welcome back, {user?.name||'learner'}. Let's make a little progress.</p></div><button className="primary-action" onClick={()=>setActiveTab('planner')}>Create my study plan <ArrowRight size={17}/></button></section>
 {error&&<p role="alert" className="desk-error">{error} <button onClick={()=>setReload(n=>n+1)}>Retry</button></p>}
 <div className="desk-metrics" aria-busy={loading}>{metrics.map(m=><div key={m.label}><p>{m.label}</p><strong>{loading?'—':m.value}<small>{m.unit}</small></strong><span>{loading?'Loading activity…':m.note}</span></div>)}</div>
 <LearningOverview/>
 <div className="desk-bottom"><section className="desk-panel"><div className="panel-heading"><div><p className="eyebrow">THE WEEK SO FAR</p><h2>Time well spent.</h2></div><span className="quiet-note">Estimated hours</span></div><div className="h-60 w-full min-w-0">{weekly.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} margin={{top:20,right:12,left:-24,bottom:0}}><CartesianGrid vertical={false} stroke="var(--desk-border)"/><XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--desk-muted)"/><YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--desk-muted)"/><Tooltip contentStyle={{background:'var(--desk-surface)',border:'1px solid var(--desk-border)',borderRadius:6,color:'var(--desk-ink)'}} cursor={{fill:'var(--desk-soft)'}}/><Bar dataKey="hoursStudied" name="Estimated hours" fill="#23786a" maxBarSize={30} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>:<p role="status" className="h-full flex items-center justify-center text-sm text-slate-500">{loading?'Loading your week…':'Your next study session starts the story.'}</p>}</div></section><section className="desk-panel"><div className="panel-heading"><div><p className="eyebrow">PICK UP WHERE YOU ARE</p><h2>Your next move.</h2></div></div>{tools.map(t=><button className="desk-tool" key={t.tab} onClick={()=>setActiveTab(t.tab as TabType)}><t.icon size={19}/><span><strong>{t.title}</strong><small>{t.text}</small></span><ArrowUpRight size={17}/></button>)}</section></div>
 </div>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/dashboard/DemoGuide.tsx

Keep synthetic-data disclosure and demo navigation in a quieter responsive panel.

````
import {useAuth} from '../../context/AuthContext';
export function DemoGuide(){const {user,setActiveTab}=useAuth();if(!user?.isDemo)return null;
 return <aside aria-label="Demo walkthrough" className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 space-y-3"><div><strong>Demo workspace</strong><p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Synthetic syllabus, scores and history. Explore the saved plan and TCP recovery quiz without AI or email credentials. New AI generation still needs a key.</p></div><div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">{([{tab:'planner',label:'1 · Inspect the plan'},{tab:'quiz',label:'2 · Take the saved quiz'},{tab:'dashboard',label:'3 · Check readiness'},{tab:'flashcards',label:'4 · Review due topics'}] as const).map(s=><button key={s.tab} onClick={()=>setActiveTab(s.tab)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">{s.label}</button>)}</div></aside>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/dashboard/LearningOverview.tsx

Refine readiness table spacing and hierarchy without changing calculations.

````
import {useEffect,useState} from 'react';
import {fetchApi} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import type {readiness} from '../../../server/services/learning';
type Exam=ReturnType<typeof readiness>;
export function LearningOverview({reviews=false}:{reviews?:boolean}) {
 const {setActiveTab}=useAuth();
 const [exams,setExams]=useState<Exam[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[today,setToday]=useState('');
 async function load(){setError('');try{const r=await fetchApi('/api/progress');setExams(r.exams);setToday(r.today);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{void load();const refresh=()=>void load();const timer=setInterval(refresh,60000);window.addEventListener('studysniper-progress-changed',refresh);return()=>{clearInterval(timer);window.removeEventListener('studysniper-progress-changed',refresh);};},[]);
 async function review(id:string,topicId:string,rating:string){setBusy(id+topicId);setError('');try{await fetchApi(`/api/progress/${id}/topics/${topicId}/review`,{method:'POST',body:JSON.stringify({rating})});await load();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 return <section className="readiness-panel rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3" aria-label={reviews?'Topic revision queue':'Exam readiness'}>
  <h2 className="font-semibold text-lg">{reviews?'Topic revision queue':'Exam readiness'}</h2>
  {loading&&<p role="status">Loading learning progress…</p>}{error&&<p role="alert">{error} <button onClick={load} className="underline">Retry</button></p>}
  {!loading&&!exams.length&&<p className="text-sm">Create a syllabus pipeline in Study Planner to track topic readiness and reviews. <button onClick={()=>setActiveTab('planner')} className="underline">Open planner</button></p>}
  <p className="text-xs text-slate-500">{reviews?'Fixed review intervals: 1, 3, 7, 14 and 30 days. Again resets to 1 day. Self-review changes the due date, not your measured mastery. Dates use UTC.':'Readiness reflects graded work across the whole syllabus, including unassessed topics. It is a study indicator, not a predicted exam mark.'}</p>
  {exams.map(exam=><div key={exam.id} className="border-t border-slate-200 dark:border-slate-800 pt-3"><div className="flex justify-between gap-3"><h3 className="font-semibold">{exam.title}</h3><strong>{exam.readiness}% ready</strong></div><p className="text-xs">{exam.assessed}/{exam.total} topics assessed · Exam {exam.examDate} · Weighted by {exam.weighting}</p>
   <div className="overflow-x-auto readiness-table"><table className="w-full text-xs text-left mt-2"><thead><tr><th className="p-2">Topic</th><th className="p-2">Mastery</th><th className="p-2">Readiness</th><th className="p-2">Review due</th>{reviews&&<th className="p-2">Review</th>}</tr></thead><tbody>{exam.topics.filter(t=>!reviews||t.nextReview<=today).map(t=><tr key={t.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-2">{t.name}</td><td className="p-2">{t.mastery===null?'Unassessed':`${t.mastery}% (${t.attempts} results)`}</td><td className="p-2">{t.readiness}%</td><td className="p-2">{t.nextReview}{t.overdue?' · overdue':''}</td>{reviews&&<td className="p-2 whitespace-nowrap"><button className="rounded bg-emerald-700 px-2 py-1 text-white mr-2 disabled:opacity-50" disabled={!!busy} onClick={()=>review(exam.id,t.id,'good')}>Reviewed</button><button className="underline disabled:opacity-50" disabled={!!busy} onClick={()=>review(exam.id,t.id,'again')}>Again</button></td>}</tr>)}</tbody></table></div>
   {reviews&&!exam.topics.some(t=>t.nextReview<=today)&&<p className="text-sm mt-2">All topic reviews are scheduled for later.</p>}
  </div>)}
  {!reviews&&<details className="text-xs text-slate-500"><summary>How this score is calculated</summary>Mastery is the mean of the latest five graded results per topic. Topic readiness = mastery × (0.5 + 0.5 × min(attempts / 3, 1)), reduced by 15% when review is overdue. Unassessed topics contribute zero. Exam readiness is the weighted mean; complete percentage weightage is used when supplied, otherwise estimated importance. Completing a timetable task does not award mastery.</details>}
 </section>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/documents/DocumentsView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import { LoadState } from '../common/LoadState';
import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Document } from '../../types';
import { parseDocumentFile } from '../../utils/documentParser';
import {
  UploadCloud,
  FileText,
  File,
  Trash2,
  HelpCircle,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  X,
  MessageSquare,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { showToast } = useAuth();
  const [loadError,setLoadError]=useState('');
  const [initialLoading,setInitialLoading]=useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ask question modal state
  const [question, setQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const selectedIdRef=useRef<string|null>(null);
  selectedIdRef.current=selectedDoc?.id || null;
  const [qaPairs, setQaPairs] = useState<{ q: string; a: string; citations?: {chunkId:string;quote:string}[] }[]>([]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    setInitialLoading(true);setLoadError('');
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
      if (res.documents.length > 0) {
        setSelectedDoc(res.documents[0]);
      }
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load study data.');
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }

  const handleFileUpload = async (fileName: string, fileType: string, textContent: string, size?: number) => {
    setUploading(true);
    try {
      const res = await api.uploadDocument({
        fileName,
        fileType,
        fileSize: size || textContent.length,
        textContent
      });
      setDocuments(prev => [res.document, ...prev]);
      setSelectedDoc(res.document);
      setQaPairs([]);
      if(res.warning) showToast(res.warning,'info');
      showToast(`Uploaded and extracted ${fileName}`, 'success');
    } catch (e) {
      showToast((e as Error).message || 'Failed to process document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0 || uploading) return;
    if(fileArray.length>5){showToast('Upload at most five files at a time.','error');return;}

    setUploading(true);
    let count = 0;
    try {
      for (const file of fileArray) {
        const parsed = await parseDocumentFile(file);
        const res = await api.uploadDocument({
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          fileSize: parsed.fileSize,
          textContent: parsed.textContent
        });
        setDocuments(prev => [res.document, ...prev.filter(d => d.id !== res.document.id)]);
        setSelectedDoc(res.document);
      setQaPairs([]);
        count++;
        if(res.warning) showToast(res.warning,'info');
      }
      if (count === 1) {
        showToast(`Uploaded and extracted ${fileArray[0].name}`, 'success');
      } else {
        showToast(`Successfully uploaded ${count} documents`, 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
      showToast((e as Error).message || 'Failed to parse or upload document.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const loadSampleDoc = (title: string, content: string) => {
    handleFileUpload(title, title.endsWith('.docx') ? 'DOCX' : 'PDF', content);
  };

  const handleAskQuestion = async () => {
    if (!selectedDoc || !question.trim() || askLoading) return;
    const currentQ = question;
    const documentId=selectedDoc.id;
    setQuestion('');
    setAskLoading(true);

    try {
      const res = await api.askDocument(documentId, currentQ);
      if(selectedIdRef.current!==documentId)return;
      setQaPairs(prev => [...prev, { q: currentQ, a: res.answer, citations:res.citations }]);
    } catch (e) {
      showToast((e as Error).message || 'Failed to answer document question.', 'error');
    } finally {
      setAskLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) {
        const remaining = documents.filter(d => d.id !== id);
        setSelectedDoc(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Document removed.', 'info');
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <LoadState loading={initialLoading} error={loadError} retry={loadDocs} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-teal-400" /> Upload Documents & Smart QA
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload PDF, DOCX, PPTX, or TXT files to generate summaries and ask Gemini questions.
          </p>
        </div>

        {/* Action & Upload Buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg  transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Upload Document
          </button>
          <button
            onClick={() =>
              loadSampleDoc(
                'Quantum_Physics_Ch4.pdf',
                'Quantum mechanics describes the fundamental physical properties of nature at the scale of atoms and subatomic particles. Wave-particle duality states that matter exhibits both wave-like and particle-like behaviors. Schrödinger Equation governing wavefunction evolution: iħ ∂/∂t Ψ = ĤΨ.'
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 border border-slate-700 transition"
          >
            + Sample PDF
          </button>
          <button
            onClick={() =>
              loadSampleDoc(
                'Algorithms_Notes.docx',
                'Dynamic Programming (DP) is an algorithmic optimization technique that breaks down complex problems into overlapping subproblems, storing results in a lookup table. Time complexity of 0/1 Knapsack using DP is O(n*W).'
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 border border-slate-700 transition"
          >
            + Sample DOCX
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.docx,.pptx,.txt,.md,.csv,.json,.js,.py,.c,.cpp,.html,.css"
        multiple
        className="hidden"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-8 rounded-xl border-2 border-dashed transition text-center flex flex-col items-center justify-center gap-3 cursor-pointer group ${
          isDragging
            ? 'border-teal-500 bg-teal-500/10'
            : 'border-slate-800 bg-slate-900/60 hover:border-teal-500/50 hover:bg-slate-900/90'
        }`}
      >
        <div className="w-12 h-12 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-200">
            {uploading ? 'Extracting document text...' : 'Drag and drop your document here, or '}
            {!uploading && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-teal-400 underline hover:text-teal-300 transition"
              >
                browse files
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, PPTX, TXT, MD, CSV & Code (Up to 10MB; 100 pages; text-based documents)</div>
        </div>
      </div>

      {/* Document Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List (1 col) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
            <span>Stored Documents ({documents.length})</span>
            <span className="text-[10px] text-teal-400 font-normal">Indexed</span>
          </div>

          {documents.map(doc => {
            const isActive = selectedDoc?.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setQaPairs([]);
                }}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between group ${
                  isActive
                    ? 'bg-teal-600/20 border-teal-500/40 text-teal-200 shadow-md'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">{doc.fileName}</div>
                    <div className="text-[10px] text-slate-400">{doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB</div>
                  </div>
                </div>

                <button
                  onClick={e => handleDelete(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Document Detail & QA (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDoc ? (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Doc Title & Meta */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {selectedDoc.fileType}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedDoc.fileName}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">Uploaded on {new Date(selectedDoc.uploadedAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Summary Card */}
              {selectedDoc.summary && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-teal-500/30">
                  <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-teal-400" /> Source Preview
                  </div>
                  <div className="markdown-body text-xs text-slate-300">
                    <Markdown>{selectedDoc.summary}</Markdown>
                  </div>
                </div>
              )}

              {/* Extracted Text Content Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {selectedDoc.fileType === 'PPTX' || selectedDoc.fileType === 'PPT' ? 'Extracted Slide Content' : 'Parsed Document Text'}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {selectedDoc.extractedText.length.toLocaleString()} characters
                  </span>
                </div>

                {selectedDoc.extractedText.includes('[Slide ') ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {selectedDoc.extractedText
                      .split(/\[Slide\s+(\d+)\]/g)
                      .filter(Boolean)
                      .reduce<{ num: string; text: string }[]>((acc, curr, idx, arr) => {
                        if (idx % 2 === 0 && !isNaN(Number(curr))) {
                          acc.push({ num: curr, text: arr[idx + 1] || '' });
                        }
                        return acc;
                      }, [])
                      .map((slide, sIdx) => (
                        <div key={sIdx} className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                              Slide {slide.num}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pt-1">
                            {slide.text.trim()}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed max-h-52 overflow-y-auto font-mono whitespace-pre-wrap">
                    {selectedDoc.extractedText}
                  </div>
                )}
              </div>

              {/* Document QA Section */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-400" /> Ask Questions About This Document
                </h3>

                {qaPairs.length > 0 && (
                  <div className="space-y-3">
                    {qaPairs.map((pair, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-800 space-y-2 text-xs">
                        <div className="font-semibold text-teal-300">Q: {pair.q}</div>
                        <div className="markdown-body text-slate-300 text-xs">
                          <Markdown>{pair.a}</Markdown>{pair.citations?.map((c,i)=><blockquote key={i} className="mt-2 border-l-2 pl-2">[{c.chunkId}] {c.quote}</blockquote>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                    placeholder="e.g. What is the core formula mentioned in this document?"
                    className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={askLoading || !question.trim()}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2 transition disabled:opacity-40"
                  >
                    {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask AI'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              Select or upload a document to view summaries and start asking questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/flashcards/FlashcardsView.tsx

Remove decorative emoji/gradients and preserve readable light and dark revision cards.

````
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


````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/landing/LandingPage.tsx

Replace the marketing page with editorial typography, an illustrative timetable, concise sections and responsive navigation.

````
import {ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Layers, Target, Menu, X} from 'lucide-react';
import {useState} from 'react';
import {useAuth} from '../../context/AuthContext';
export function LandingPage(){
 const {setAuthModalOpen,setAuthModalMode}=useAuth();const [menu,setMenu]=useState(false);
 const open=(mode:'login'|'signup')=>{setAuthModalMode(mode);setAuthModalOpen(true);setMenu(false);};
 return <div className="editorial-landing">
  <header className="landing-nav"><a href="#" className="wordmark"><Target size={25}/><span>StudySniper<span className="brand-dot">.</span></span></a><nav aria-label="Main navigation" className={menu?'landing-links is-open':'landing-links'}><a href="#method" onClick={()=>setMenu(false)}>The method</a><a href="#workspace" onClick={()=>setMenu(false)}>Your workspace</a><button onClick={()=>open('login')}>Sign in <ArrowUpRight size={16}/></button></nav><button className="landing-menu" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></header>
  <main>
   <section className="landing-hero"><div className="hero-copy"><p className="eyebrow"><span className="status-dot"/> A little structure. A lot more clarity.</p><h1>Less figuring out.<br/><em>More getting there.</em></h1><p className="hero-description">Your syllabus, your time, your next move. Build a study plan that adjusts as you learn—and makes room for the days that don't go to plan.</p><div className="hero-actions"><button className="primary-action" onClick={()=>open('signup')}>Build my study plan <ArrowRight size={18}/></button><button className="text-action" onClick={()=>open('login')}>Explore the workspace <ArrowUpRight size={17}/></button></div><p className="quiet-note">Made for real schedules. Progress saved between sessions.</p></div>
   <div className="plan-preview" aria-label="Illustrative study plan preview"><div className="preview-top"><span className="eyebrow">THE NEXT SMALL STEP</span><span className="preview-tag">Example plan</span></div><div className="preview-heading"><h2>Make today count.</h2><span>02 hrs<br/><small>available</small></span></div><div className="preview-row"><span className="preview-time">09:00</span><div><span className="preview-category">REVISIT</span><h3>Transport protocols</h3><p>Review the ideas that need another look.</p></div><Layers size={18}/></div><div className="preview-row"><span className="preview-time">09:30</span><div><span className="preview-category">PRACTICE</span><h3>Put it to the test</h3><p>A short quiz, grounded in your notes.</p></div><BookOpen size={18}/></div><div className="preview-row"><span className="preview-time">10:00</span><div><span className="preview-category">BUILD</span><h3>One topic further</h3><p>A focused session on packet routing.</p></div><ArrowUpRight size={18}/></div><div className="preview-footer"><Check size={17}/><span>Missed a session? Your plan can move with you.</span></div></div>
   </section>
   <div className="landing-principles"><span><Target size={18}/> Focus on what matters</span><span><CalendarDays size={18}/> Make time realistic</span><span><Layers size={18}/> Revisit before you forget</span></div>
   <section id="method" className="method-section"><div className="section-intro"><p className="eyebrow">A STUDY ROUTINE, CONNECTED</p><h2>Start with your syllabus.<br/>Keep going with a clear next step.</h2></div><div className="method-grid">{[{n:'01',title:'Bring your material.',text:'Upload a readable syllabus and notes. Topics, deadlines and supporting evidence stay together.'},{n:'02',title:'Find your rhythm.',text:'Set your available hours. Get a day-by-day timetable, then rebalance it when life gets in the way.'},{n:'03',title:'Know where you stand.',text:'Use practice results to track topic mastery. Return to due reviews and give weak areas more time.'}].map(x=><article key={x.n}><span className="method-number">{x.n}</span><h3>{x.title}</h3><p>{x.text}</p></article>)}</div></section>
   <section id="workspace" className="workspace-section"><div><p className="eyebrow">ONE PLACE TO COME BACK TO</p><h2>Your progress has a home.</h2><p>Keep notes, practice, revision and planning connected. No copying scores into another prompt. No rebuilding your timetable from memory.</p><button className="primary-action" onClick={()=>open('signup')}>Start with your syllabus <ArrowRight size={18}/></button></div><ul>{['Source-grounded explanations','Plans that respond to missed work','Topic mastery and review dates','In-app reminders and calendar export'].map(t=><li key={t}><Check size={18}/>{t}</li>)}</ul></section>
  </main><footer className="landing-footer"><span className="wordmark"><Target size={20}/>StudySniper.</span><span>Small sessions. Visible progress.</span><button onClick={()=>open('login')}>Open your workspace <ArrowUpRight size={16}/></button></footer>
 </div>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/notes/NotesView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import { LoadState } from '../common/LoadState';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Note } from '../../types';
import {
  FileText,
  Sparkles,
  Printer,
  Trash2,
  Plus,
  Tag,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Download
} from 'lucide-react';

export const NotesView: React.FC = () => {
  const { showToast } = useAuth();

  const [loadError,setLoadError]=useState('');
  const [initialLoading,setInitialLoading]=useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Note Generator State
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [rawContent, setRawContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setInitialLoading(true);setLoadError('');
    try {
      const res = await api.getNotes();
      setNotes(res.notes);
      if (res.notes.length > 0) {
        setSelectedNote(res.notes[0]);
      }
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load study data.');
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }

  const handleGenerateNote = async () => {
    if (!topic.trim() || !rawContent.trim() || generating) return;
    setGenerating(true);

    try {
      const res = await api.generateNote({
        topic,
        subject,
        rawContent
      });

      setNotes(prev => [res.note, ...prev]);
      setSelectedNote(res.note);
      showToast('AI Note summary generated!', 'success');
      setTopic('');
      setRawContent('');
    } catch (e) {
      showToast((e as Error).message || 'Failed to generate note.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        const remaining = notes.filter(n => n.id !== id);
        setSelectedNote(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Note deleted.', 'info');
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    }
  };

  const handlePrintPdf = () => {
    if (!selectedNote) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]!));
    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(selectedNote.title)} - Study Sniper AI Note</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            h1 { color: #6366f1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .section { margin-bottom: 24px; }
            .section-title { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #64748b; margin-bottom: 8px; }
            .summary { background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px; border-radius: 4px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .def { background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; }
            .formula { font-family: monospace; background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 6px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(selectedNote.title)}</h1>
          <p><strong>Subject:</strong> ${escapeHtml(selectedNote.subject)} | <strong>Date:</strong> ${new Date(selectedNote.createdAt).toLocaleDateString()}</p>
          
          <div class="section">
            <div class="section-title">Executive Summary</div>
            <div class="summary">${escapeHtml(selectedNote.summary)}</div>
          </div>

          <div class="section">
            <div class="section-title">Key Points</div>
            <ul>
              ${selectedNote.keyPoints.map(kp => `<li>${escapeHtml(kp)}</li>`).join('')}
            </ul>
          </div>

          ${selectedNote.definitions.length > 0 ? `
            <div class="section">
              <div class="section-title">Core Definitions</div>
              ${selectedNote.definitions.map(d => `<div class="def"><strong>${escapeHtml(d.term)}:</strong> ${escapeHtml(d.definition)}</div>`).join('')}
            </div>
          ` : ''}

          ${selectedNote.formulas.length > 0 ? `
            <div class="section">
              <div class="section-title">Important Formulas</div>
              ${selectedNote.formulas.map(f => `<div class="formula">${escapeHtml(f)}</div>`).join('')}
            </div>
          ` : ''}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <LoadState loading={initialLoading} error={loadError} retry={loadNotes} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-teal-400" /> AI Notes Engine & PDF Exporter
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Paste textbook excerpts or lecture transcripts to generate structured study summaries, definitions, and key formulas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form & Notes List */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" /> Summarize Raw Text
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Note Title / Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Thermodynamics Laws"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Raw Lecture / Textbook Content</label>
              <textarea
                rows={4}
                value={rawContent}
                onChange={e => setRawContent(e.target.value)}
                placeholder="Paste notes, lecture transcripts, or textbook paragraphs here..."
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-teal-500 rounded-xl text-slate-100 text-xs focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleGenerateNote}
              disabled={generating || !topic.trim() || !rawContent.trim()}
              className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-lg  flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate AI Note Summary'}
            </button>
          </div>

          {/* Saved Notes List */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Saved Notes ({notes.length})</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {notes.map(n => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNote(n)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between group ${
                    selectedNote?.id === n.id
                      ? 'bg-teal-600/20 border-teal-500/40 text-teal-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-200 truncate">{n.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{n.summary}</div>
                  </div>
                  <button
                    onClick={e => handleDeleteNote(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Note View (2 cols) */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {selectedNote.subject}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedNote.title}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">Created on {new Date(selectedNote.createdAt).toLocaleDateString()}</div>
                </div>

                <button
                  onClick={handlePrintPdf}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md  transition"
                >
                  <Printer className="w-4 h-4" /> Export as Printable PDF
                </button>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-teal-500/30">
                <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-teal-400" /> Summary
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">{selectedNote.summary}</div>
              </div>

              {/* Key Points */}
              {selectedNote.keyPoints.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Bullet Takeaways</div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {selectedNote.keyPoints.map((kp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-teal-400 font-bold">•</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Definitions */}
              {selectedNote.definitions.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Definitions</div>
                  <div className="space-y-2">
                    {selectedNote.definitions.map((def, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
                        <strong className="text-teal-300">{def.term}:</strong>{' '}
                        <span className="text-slate-300">{def.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas */}
              {selectedNote.formulas.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Important Formulas</div>
                  <div className="space-y-1.5 font-mono text-xs text-teal-300">
                    {selectedNote.formulas.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
              Select or generate a note summary to view detailed breakdowns and export to PDF.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/planner/QuickPlan.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import {useEffect,useRef,useState} from 'react';
import {fetchApi} from '../../services/api';
import {parseDocumentFile} from '../../utils/documentParser';
import {useAuth} from '../../context/AuthContext';
import type {PublicPipeline} from '../../../server/agents/schemas';
import type {StudyPlan} from '../../types';
const input='mt-1 block w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{return new Promise((resolve,reject)=>{const abort=()=>reject(new Error('The quick-plan time limit was reached. Saved progress is available below.'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});}
export function QuickPlan({onReady,onSaved}:{onReady:(run:PublicPipeline,plan:StudyPlan)=>void;onSaved:()=>void}) {
 const {user}=useAuth();
 const [file,setFile]=useState<File|null>(null),[hours,setHours]=useState(2),[exam,setExam]=useState(new Date(Date.now()+14*86400000).toISOString().slice(0,10));
 const [busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
 const fileInput=useRef<HTMLInputElement|null>(null);
 const controller=useRef<AbortController|null>(null),started=useRef(0);
 useEffect(()=>{if(!busy)return;const timer=setInterval(()=>setElapsed((Date.now()-started.current)/1000),250);return()=>clearInterval(timer);},[busy]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function generate(){
  if(!file||busy)return;const ctrl=new AbortController();controller.current=ctrl;const timer=setTimeout(()=>ctrl.abort(),55000);
  setBusy(true);setError('');setElapsed(0);started.current=Date.now();
  try{
   setStage('Reading your syllabus');const source=await abortable(parseDocumentFile(file),ctrl.signal);
   if(source.textContent.length>30000)throw new Error('Use a syllabus excerpt up to 30,000 characters. Keep longer notes in Documents.');
   setStage('Saving your source');const uploaded=await fetchApi('/api/documents/upload',{method:'POST',signal:ctrl.signal,body:JSON.stringify({...source,summarize:false})});
   const remaining=50000-(Date.now()-started.current);if(remaining<1000)throw new Error('The source was saved, but parsing took too long. Continue from saved sources below.');
   setStage('Extracting topics, scoring priorities and building your timetable');
   const result=await fetchApi('/api/agents/quick-plan',{method:'POST',signal:ctrl.signal,body:JSON.stringify({documentId:uploaded.document.id,dailyHours:hours,examDate:exam,budgetMs:Math.min(50000,remaining)})});
   setElapsed((Date.now()-started.current)/1000);setStage('Your plan is ready');setFile(null);if(fileInput.current)fileInput.current.value='';onReady(result.pipeline,result.studyPlan);
  }catch(e){setError(ctrl.signal.aborted?'The quick-plan time limit was reached. Open saved progress below to continue.':(e as Error).message);setStage('');onSaved();}
  finally{clearTimeout(timer);setBusy(false);}
 }
 async function openDemo(){setError('');try{const [runs,plans]=await Promise.all([fetchApi('/api/agents'),fetchApi('/api/study-planner')]);const run=runs.pipelines.find((r:PublicPipeline)=>r.planId&&plans.studyPlans.some((p:StudyPlan)=>p.id===r.planId));if(!run)throw new Error('The demo plan was removed. Open a fresh isolated demo account.');onReady(run,plans.studyPlans.find((p:StudyPlan)=>p.id===run.planId));setStage('Prebuilt demo plan opened');setElapsed(0);}catch(e){setError((e as Error).message);}}
 return <section aria-label="Quick syllabus plan" className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 sm:p-6 dark:border-emerald-800 dark:bg-slate-900 space-y-4">
  <div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Start here</p><h2 className="text-xl font-bold">Your syllabus. Your time. One plan.</h2><p className="text-sm text-slate-600 dark:text-slate-400">Choose a file and click once. We save your source, extract topics and create a day-by-day timetable.</p></div><span className="self-start rounded-full border border-emerald-500/30 px-3 py-1 text-xs">Target: under a minute</span></div>
  <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-medium">Syllabus file<input className={input} ref={fileInput} aria-label="Syllabus file" type="file" accept=".pdf,.docx,.pptx,.txt,.md" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setStage('');setError('');}}/><span className="text-xs text-slate-500">Readable PDF, DOCX, PPTX, TXT or MD · up to 10 MB</span></label><label className="text-sm font-medium">Exam date<input className={input} type="date" value={exam} min={new Date().toISOString().slice(0,10)} disabled={busy} onChange={e=>setExam(e.target.value)}/></label><label className="text-sm font-medium">Hours available each day<input className={input} type="number" min={0.25} max={12} step={0.25} value={hours} disabled={busy} onChange={e=>setHours(Number(e.target.value))}/></label></div>
  <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={busy||!file||!exam||hours<0.25||hours>12} onClick={generate}>{busy?'Creating your plan…':'Upload & create my plan'}</button>{user?.isDemo&&<button className="rounded-xl border border-slate-400 px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={busy} onClick={openDemo}>Open prebuilt demo plan</button>}</div>
  {stage&&<p role="status" aria-live="polite" className="text-sm font-medium">{stage}{elapsed>0&&` · ${elapsed.toFixed(1)}s`}</p>}{error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
  <p className="text-xs text-slate-500">Live generation needs a configured AI key. The quick flow stops within 55 seconds and keeps completed stages if the provider is slow. Your selected exam date applies to all topics.</p>
 </section>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/planner/StudyPlannerView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import {PlanActions} from './PlanActions';
import {SyllabusAgentPanel} from './SyllabusAgentPanel';
import { LoadState } from '../common/LoadState';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StudyPlan } from '../../types';
import {
  Calendar,
  Sparkles,
  CheckSquare,
  Square,
  Clock,
  Award,
  Trash2,
  Plus,
  Loader2,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export const StudyPlannerView: React.FC = () => {
  const { showToast } = useAuth();

  const [loadError,setLoadError]=useState('');
  const [initialLoading,setInitialLoading]=useState(true);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form input state
  const [title, setTitle] = useState('');
  const [subjectInput, setSubjectInput] = useState('Physics, Calculus, CS 101');
  const [examDate, setExamDate] = useState(new Date(Date.now()+30*86400000).toISOString().slice(0,10));
  const [dailyHours, setDailyHours] = useState(3);

  useEffect(() => {
    loadPlans();
    const refresh=()=>{void api.getStudyPlans().then(r=>{setPlans(r.studyPlans);setActivePlan(current=>r.studyPlans.find((p:StudyPlan)=>p.id===current?.id)||r.studyPlans[0]||null);}).catch(()=>{});};
    const timer=setInterval(refresh,60000);window.addEventListener('studysniper-progress-changed',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('studysniper-progress-changed',refresh);};
  }, []);

  async function loadPlans() {
    setInitialLoading(true);setLoadError('');
    try {
      const res = await api.getStudyPlans();
      setPlans(res.studyPlans);
      if (res.studyPlans.length > 0) {
        setActivePlan(res.studyPlans[0]);
      }
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load study data.');
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }

  const handleGeneratePlan = async () => {
    const subjects = subjectInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (subjects.length === 0 || generating) return;
    setGenerating(true);

    try {
      const res = await api.generateStudyPlan({
        title: title || `${subjects.join(' & ')} Exam Plan`,
        subjects,
        examDate,
        dailyHours
      });

      setPlans(prev => [res.studyPlan, ...prev]);
      setActivePlan(res.studyPlan);
      showToast('Personalized study timetable generated!', 'success');
      setTitle('');
    } catch (e) {
      showToast((e as Error).message || 'Failed to generate study plan.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!activePlan) return;
    try {
      const res = await api.toggleStudyTask(activePlan.id, taskId);
      setActivePlan(res.studyPlan);
      setPlans(prev => prev.map(p => (p.id === res.studyPlan.id ? res.studyPlan : p)));
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    }
  };

  const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteStudyPlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      if (activePlan?.id === id) {
        const remaining = plans.filter(p => p.id !== id);
        setActivePlan(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Study plan removed.', 'info');
    } catch (e: any) {
      showToast(e.message || 'Request failed. Please retry.', 'error');
    }
  };

  // Progress math
  const completedTasks = activePlan?.tasks.filter(t => t.completed).length || 0;
  const totalTasks = activePlan?.tasks.length || 1;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <LoadState loading={initialLoading} error={loadError} retry={loadPlans} />
      <SyllabusAgentPanel onPlan={plan=>{setPlans(prev=>[plan,...prev.filter(p=>p.id!==plan.id)]);setActivePlan(plan);}} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-400" /> AI Personalized Study Planner
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Input your subjects, target exam date, and daily study hours to construct an optimal study schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form & Plan List Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Generate Timetable
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subjects (Comma Separated)</label>
              <input
                type="text"
                value={subjectInput}
                onChange={e => setSubjectInput(e.target.value)}
                placeholder="Physics, Calculus, History"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-emerald-500 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Exam Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0,10)}
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Daily Hrs ({dailyHours}h)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={dailyHours}
                  onChange={e => setDailyHours(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer mt-2"
                />
              </div>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={generating || !subjectInput.trim()}
              className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-lg  flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Study Plan'}
            </button>
          </div>

          {/* Saved Plans List */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Saved Timetables</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {plans.map(p => (
                <div
                  key={p.id}
                  onClick={() => setActivePlan(p)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between group ${
                    activePlan?.id === p.id
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">{p.title}</div>
                    <div className="text-[10px] text-slate-400">Exam: {p.examDate} • {p.dailyHours}h/day</div>
                  </div>
                  <button
                    onClick={e => handleDeletePlan(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timetable Checklist Display (2 cols) */}
        <div className="lg:col-span-2">
          {activePlan ? (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Exam Target: {activePlan.examDate}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{activePlan.title}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Subjects: {activePlan.subjects.join(', ')} • Pace: {activePlan.dailyHours} hrs/day
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{progressPercent}%</div>
                  <div className="text-[10px] text-slate-400">Schedule Completed</div>
                </div>
              </div>

              <PlanActions plan={activePlan} onUpdate={plan=>{setActivePlan(plan);setPlans(prev=>prev.map(p=>p.id===plan.id?plan:p));}} />
              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Task Checklist */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your day-by-day timetable</div>

                <div className="space-y-2">
                  {activePlan.tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                        task.completed
                          ? 'bg-slate-800/40 border-slate-800/60 text-slate-500 line-through'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-emerald-300 mr-2">{task.unscheduled?'Unscheduled':task.day}:</span>
                          <span className="font-semibold text-slate-100 mr-2">[{task.subject}]</span>
                          <span>{task.topic}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-500" /> {task.durationMinutes} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
              Generate a study plan to construct your day-by-day exam schedule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/planner/SyllabusAgentPanel.tsx

Use simpler surfaces and explicit complete/pending pipeline status labels.

````
import {QuickPlan} from './QuickPlan';
import {useEffect,useState} from 'react';
import {fetchApi} from '../../services/api';
import {SourceSelect} from '../common/SourceSelect';
import type {PublicPipeline} from '../../../server/agents/schemas';
import type {StudyPlan} from '../../types';
const field='w-full rounded-lg border border-slate-700 bg-slate-100 dark:bg-slate-800 p-2 text-sm text-slate-900 dark:text-white';
const button='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
export function SyllabusAgentPanel({onPlan}:{onPlan:(plan:StudyPlan)=>void}) {
 const [runs,setRuns]=useState<PublicPipeline[]>([]),[id,setId]=useState(''),[documentId,setDocumentId]=useState('');
 const [examDate,setExamDate]=useState(''),[hours,setHours]=useState(2),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [priorities,setPriorities]=useState<Record<string,number>>({}),[answers,setAnswers]=useState<Record<string,string>>({});
 const [assessmentId,setAssessmentId]=useState('');
 const run=runs.find(r=>r.id===id),assessment=run?.assessments.find(a=>a.id===assessmentId);
 const save=(pipeline:PublicPipeline)=>{setRuns(prev=>[pipeline,...prev.filter(r=>r.id!==pipeline.id)]);setId(pipeline.id);return pipeline;};
 async function load(){setBusy('Loading saved pipelines…');setError('');try{const r=await fetchApi<{pipelines:PublicPipeline[]}>('/api/agents');setRuns(r.pipelines);if(r.pipelines[0])setId(r.pipelines[0].id);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 useEffect(()=>{void load();},[]);
 const post=async(path:string,body={})=>fetchApi<{pipeline:PublicPipeline;studyPlan?:StudyPlan}>('/api/agents'+path,{method:'POST',body:JSON.stringify(body)});
 async function action(label:string,work:()=>Promise<void>){if(busy)return;setBusy(label);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function start(){await action('Parser: extracting syllabus…',async()=>{
  const parsed=save((await post('/parse',{documentId,dailyHours:hours,...(examDate?{examDate}:{})})).pipeline);
  setPriorities({});setAssessmentId('');setAnswers({});setBusy('Analyzer: scoring topics…');
  save((await post(`/${parsed.id}/analyze`)).pipeline);
 });}
 return <div className="space-y-5"><QuickPlan onReady={(pipeline,plan)=>{save(pipeline);setAssessmentId('');onPlan(plan);}} onSaved={()=>void load()}/><section aria-label="Syllabus agents" className="space-y-4 rounded-xl border border-emerald-700/60 bg-white dark:bg-slate-900 p-5 text-slate-800 dark:text-slate-200">
  <div><h2 className="text-lg font-bold">Saved plans & topic practice</h2><p className="text-xs text-slate-600 dark:text-slate-400">Review your topics, practice weak areas, or reuse an uploaded source.</p></div>
  <details><summary className="cursor-pointer text-sm font-semibold">Advanced: plan from an existing source</summary><div className="grid gap-4 md:grid-cols-3 mt-3"><SourceSelect value={documentId} onChange={setDocumentId}/><label className="text-xs">Exam date override (optional)<input aria-label="Agent exam date" className={field} type="date" min={new Date().toISOString().slice(0,10)} value={examDate} onChange={e=>setExamDate(e.target.value)}/><span className="text-slate-600 dark:text-slate-400">Required if your syllabus has no future ISO date. Overrides all unit dates.</span></label><label className="text-xs">Hours available per day<input className={field} type="number" min={0.25} max={12} step={0.25} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label></div>
  <button className={button} disabled={!!busy||!documentId||hours<0.25||hours>12} onClick={start}>Parse & analyze syllabus</button>
  <p className="text-xs text-slate-600 dark:text-slate-400">Upload a readable syllabus in Documents first (agent limit: 30,000 characters / 60 topics). A topic-only syllabus can make a plan; quizzes need explanatory notes in the same source.</p></details>
  {busy&&<p role="status" aria-live="polite">{busy}</p>}{error&&<p role="alert" className="text-rose-700 dark:text-rose-300">{error} <button disabled={!!busy} onClick={load} className="underline">Reload saved progress</button></p>}
  <label className="block text-xs">Saved pipelines<select aria-label="Saved syllabus pipelines" className={field} value={id} disabled={!!busy} onChange={e=>{setId(e.target.value);setAssessmentId('');setAnswers({});setPriorities({});}}><option value="">{runs.length?'Choose a pipeline':'No pipelines yet'}</option>{runs.map(r=><option key={r.id} value={r.id}>{r.title} · {r.createdAt.slice(0,10)}</option>)}</select></label>
  {run&&<>
   <p className="text-xs">Parser complete · Analyzer {run.analysis?'complete':'pending'} · Planner {run.planId?'complete':'pending'} · {run.assessments.filter(a=>a.completedAt).length} graded practices</p>
   {!run.analysis&&<button className={button} disabled={!!busy} onClick={()=>action('Analyzer: scoring topics…',async()=>{save((await post(`/${run.id}/analyze`)).pipeline);})}>Retry analyzer</button>}
   <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left text-slate-600 dark:text-slate-400">Difficulty and importance are AI estimates. Mastery is the mean of the latest five graded results, not an exam prediction.</caption><thead><tr>{['Topic / exam','Weightage','Difficulty / importance','Your priority','Mastery','Practice'].map(s=><th key={s} className="p-2">{s}</th>)}</tr></thead><tbody>{run.topics.map(t=>{
    const scores=run.analysis?.topics.find(a=>a.topicId===t.id),mastery=run.mastery[t.id];
    return <tr key={t.id} className="border-t border-slate-800"><td className="p-2"><strong>{t.name}</strong><div>{t.unit} · {t.examDate}</div><details><summary>Source evidence</summary><blockquote>{t.sourceQuote}</blockquote></details></td><td className="p-2">{t.weightage===null?'Not stated':`${t.weightage}%`}</td><td className="p-2">{scores?<><span>{scores.difficulty}/5 · {scores.importance}/5</span><details><summary>Reason</summary>{scores.reason}</details></>:'Pending'}</td><td className="p-2"><select aria-label={`Priority for ${t.name}`} className={field} disabled={!!busy||!!run.planId} value={priorities[t.id]??run.priorities?.[t.id]??3} onChange={e=>setPriorities(p=>({...p,[t.id]:Number(e.target.value)}))}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></td><td className="p-2">{mastery?`${mastery.score}% (${mastery.attempts})`:'Not assessed'}</td><td className="p-2"><button className={button} disabled={!!busy||!run.planId} onClick={()=>action('Coach: writing source-grounded questions…',async()=>{const r=save((await post(`/${run.id}/quiz`,{topicId:t.id})).pipeline);setAssessmentId(r.assessments.filter(a=>a.topicId===t.id&&!a.completedAt).at(-1)!.id);setAnswers({});})}>Practice</button></td></tr>;
   })}</tbody></table></div>
   <button className={button} disabled={!!busy||!run.planId} onClick={()=>action('Coach: preparing a mixed-topic mock…',async()=>{const r=save((await post(`/${run.id}/mock`)).pipeline);setAssessmentId(r.assessments.find(a=>a.kind==='mock'&&!a.completedAt)!.id);setAnswers({});})}>Start mock exam (up to 15 topics)</button>
   <button className={button} disabled={!!busy||!run.analysis} onClick={()=>action('Planner: scheduling your topics…',async()=>{const r=await post(`/${run.id}/plan`,{priorities});save(r.pipeline);if(r.studyPlan)onPlan(r.studyPlan);})}>{run.planId?'Open saved timetable':'Generate day-wise plan'}</button>
   <button className="ml-3 text-xs text-rose-700 dark:text-rose-300 underline" disabled={!!busy} onClick={()=>action('Deleting pipeline…',async()=>{await fetchApi(`/api/agents/${run.id}`,{method:'DELETE'});setRuns(prev=>prev.filter(r=>r.id!==run.id));setId('');setAssessmentId('');})}>Delete pipeline (keep timetable)</button>
   {run.assessments.length>0&&<label className="block text-xs">Practice history<select className={field} value={assessmentId} disabled={!!busy} onChange={e=>{setAssessmentId(e.target.value);setAnswers({});}}><option value="">Choose practice</option>{run.assessments.map((a,i)=><option key={a.id} value={a.id}>{i+1}. {a.kind==='mock'?'Mock exam':run.topics.find(t=>t.id===a.topicId)?.name} — {a.completedAt?`${a.score}%`:'Unanswered'}</option>)}</select></label>}
   {assessment&&<div className="space-y-3 border-t border-slate-700 pt-4"><h3 className="font-bold">{assessment.kind==='mock'?'Mock exam':'Topic practice'} {assessment.completedAt&&`— ${assessment.score}%`}</h3>{assessment.questions.map((q,i)=><div key={q.id}><label className="block text-sm">{i+1}. {q.question}<textarea className={field} maxLength={4000} disabled={!!busy||!!assessment.completedAt} value={assessment.completedAt?assessment.answers?.[q.id]||'':answers[q.id]||''} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}/></label>{assessment.completedAt&&<div className="text-xs text-slate-700 dark:text-slate-300"><p>{assessment.grades?.find(g=>g.questionId===q.id)?.feedback}</p><p>Expected: {q.expectedAnswer}</p><blockquote className="border-l-2 border-emerald-700 pl-2">{q.sourceQuote}</blockquote></div>}</div>)}{!assessment.completedAt&&<button className={button} disabled={!!busy} onClick={()=>action('Evaluator: grading answers and updating mastery…',async()=>{save((await post(`/${run.id}/assessments/${assessment.id}/evaluate`,{answers})).pipeline);})}>Grade answers & update mastery</button>}</div>}
  </>}
 </section></div>;
}

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/quiz/QuizGeneratorView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
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

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/settings/SettingsView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import {auth,googleProvider,reauthenticateWithPopup} from '../../lib/firebase';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Settings,
  User as UserIcon,
  Moon,
  Sun,
  Lock,
  Bell,
  Trash2,
  Check,
  Shield,
  Save,
  Loader2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, updateUser, darkMode, toggleDarkMode, showToast, logout, login, deleteAccount } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [targetExam, setTargetExam] = useState(user?.targetExam || 'MCAT / Final Exams');
  const [dailyGoalHours, setDailyGoalHours] = useState(user?.dailyGoalHours || 3);
  const [saving, setSaving] = useState(false);

  // Security password state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Notification toggles
  const [notifStreak, setNotifStreak] = useState(true);
  const [notifExams, setNotifExams] = useState(true);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({ name, targetExam, dailyGoalHours });
      updateUser(res.user);
      showToast('Profile settings saved!', 'success');
    } catch (err) {
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [securityBusy,setSecurityBusy]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [deletePassword,setDeletePassword]=useState('');
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();if(securityBusy)return;setSecurityBusy(true);
    try {const result=await api.changePassword(currPassword,newPassword);login(result.token,result.user);setCurrPassword('');setNewPassword('');showToast('Password changed; old sessions revoked.','success');}
    catch(error:any){showToast(error.message,'error');}
    finally{setSecurityBusy(false);}
  };
  const handleDelete=async()=>{
    setSecurityBusy(true);
    try {
      if(user?.authProvider==='firebase') {
        if(!auth?.currentUser) throw new Error('Sign in with Google again first.');
        await reauthenticateWithPopup(auth.currentUser,googleProvider);
        await deleteAccount({idToken:await auth.currentUser.getIdToken(true)});
      } else await deleteAccount({password:deletePassword});
    } catch(error:any){showToast(error.message,'error');}
    finally{setSecurityBusy(false);}
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-400" /> Settings & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account profile, theme settings, notifications, and security.
        </p>
      </div>

      {/* Profile Section */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <UserIcon className="w-4 h-4 text-teal-400" /> Account Profile
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-800/40 border border-slate-800 rounded-xl text-slate-500 text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Exam / Goal</label>
              <input
                type="text"
                value={targetExam}
                onChange={e => setTargetExam(e.target.value)}
                placeholder="e.g. USMLE Step 1, GRE, Final Semester"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Daily Study Target ({dailyGoalHours} hours)</label>
              <input
                type="range"
                min="1"
                max="12"
                value={dailyGoalHours}
                onChange={e => setDailyGoalHours(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer mt-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-md  flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
          </button>
        </form>
      </div>

      {/* Theme & Display Mode */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          {darkMode ? <Moon className="w-4 h-4 text-teal-400" /> : <Sun className="w-4 h-4 text-amber-400" />} Theme & Appearance
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">Dark / Light Interface</div>
            <div className="text-[11px] text-slate-400">Choose a light or dark workspace.</div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-2"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-teal-400" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* Password & Security */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="w-4 h-4 text-teal-400" /> Password & Security
        </div>

        {user?.authProvider==='firebase' ? <p className="text-sm">Your password is managed by Google. Use Google account security settings to change it.</p> : <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currPassword}
              onChange={e => setCurrPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={securityBusy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
          >
            {securityBusy ? 'Updating…' : 'Update Password'}
          </button>
        </form>}
      </div>

      {/* Delete / Danger Zone */}
      <div className="p-6 rounded-xl bg-slate-900 border border-rose-500/20 space-y-4">
        <div className="text-sm font-bold text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Trash2 className="w-4 h-4" /> Danger Zone
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">Delete Account</div>
            <div className="text-[11px] text-slate-400">Permanently remove your account and all stored study data.</div>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30 transition"
          >
            Delete Account
          </button>
        </div>
      </div>
      {deleteOpen && <div role="dialog" aria-modal="true" aria-label="Confirm account deletion" className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="p-6 bg-slate-900 text-white rounded-xl max-w-md space-y-4"><p>This permanently deletes your study data. This cannot be undone.</p>{user?.authProvider!=='firebase' && <input autoFocus type="password" aria-label="Confirm current password" placeholder="Current password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} className="w-full p-3 bg-slate-800 rounded-xl" />}<button disabled={securityBusy} onClick={()=>setDeleteOpen(false)} className="mr-4">Cancel</button><button disabled={securityBusy} onClick={handleDelete} className="text-rose-300">{securityBusy?'Deleting…':'Confirm permanent deletion'}</button></div></div>}
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/components/tutor/AiTutorView.tsx

Replace colorful gradient styling and decorative emoji with restrained teal accents and consistent component shapes.

````
import {SourceSelect} from '../common/SourceSelect';
import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Chat, Message } from '../../types';
import {
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Bookmark,
  Download,
  Loader2,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

export const AiTutorView: React.FC = () => {
  const [documentId,setDocumentId]=useState('');
  const { activeChatId, setActiveChatId, showToast } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [persona, setPersona] = useState<string>('socratic');

  const controllerRef=useRef<AbortController|null>(null);
  useEffect(()=>()=>controllerRef.current?.abort(),[]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const personas = [
    { id: 'socratic', name: ' Socratic Tutor', desc: 'Explains concepts clearly and asks guiding questions' },
    { id: 'exam', name: ' Strict Exam Prep', desc: 'Focuses on high-yield exam traps & key definitions' },
    { id: 'eli5', name: ' ELI5 Simple', desc: 'Explains complex topics using real-world analogies' }
  ];

  const suggestedPrompts = [
    'Explain Quantum Entanglement in simple terms',
    'Derive Bayes Theorem with a concrete example',
    'What is the difference between O(n) and O(n log n)?',
    'Summarize how Transformer Attention mechanisms work'
  ];

  // Load chat conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await api.getConversations();
        setChats(res.chats);
        if (res.chats.length > 0 && !activeChatId) {
          setActiveChatId(res.chats[0].id);
        } else if (res.chats.length === 0) {
          handleCreateNewChat();
        }
      } catch (e) {
        showToast('Could not load conversations. Reopen this tab to retry.','error');
      }
    }
    loadConversations();
  }, []);

  // Load messages whenever activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;
    async function loadMsgs() {
      try {
        const res = await api.getMessages(activeChatId!);
        setMessages(res.messages);
      } catch (e) {
        showToast('Could not load messages. Select the conversation again to retry.','error');
      }
    }
    loadMsgs();
  }, [activeChatId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateNewChat = async () => {
    try {
      const res = await api.createConversation('New AI Tutor Session');
      setChats(prev => [res.chat, ...prev]);
      setActiveChatId(res.chat.id);
      setMessages([res.initialMessage]);
    } catch (e) {
      console.error('Failed to create new chat:', e);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeChatId === id) {
        const remaining = chats.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          handleCreateNewChat();
        }
      }
      showToast('Chat session deleted.', 'info');
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const text=(customPrompt || prompt).trim();
    if(!text || loading || !activeChatId) return;
    if(!documentId){showToast('Choose an uploaded source first.','error');return;}
    const chatId=activeChatId, temporary='pending_'+Date.now();
    setPrompt('');setLoading(true);
    setMessages(prev=>[...prev,{id:temporary+'_user',chatId,role:'user',content:text,timestamp:new Date().toISOString()},{id:temporary,chatId,role:'model',content:'',timestamp:new Date().toISOString()}]);
    controllerRef.current?.abort();const controller=new AbortController();controllerRef.current=controller;
    try {
      const response=await fetch('/api/chat/message',{method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(65000)]),headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('studysniper_token')}`},body:JSON.stringify({chatId,prompt:text,documentId,systemPrompt:personas.find(p=>p.id===persona)?.desc})});
      if(!response.ok){const error=await response.json();throw new Error(error.error || 'Chat request failed.');}
      if(!response.body) throw new Error('No response stream.');
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',content='',completed=false;
      while(true) {
        const {done,value}=await reader.read();if(done)break;
        buffer+=decoder.decode(value,{stream:true});const frames=buffer.split('\n\n');buffer=frames.pop()||'';
        for(const frame of frames) {
          if(!frame.startsWith('data: '))continue;
          const event=JSON.parse(frame.slice(6));
          if(event.error)throw new Error(event.error);
          if(event.chunk){content+=event.chunk;setMessages(prev=>prev.map(m=>m.id===temporary?{...m,content}:m));}
          if(event.done){completed=true;setMessages(prev=>prev.map(m=>m.id===temporary?{...m,id:event.messageId}:m));}
        }
      }
      if(!completed)throw new Error('Response was interrupted. Please retry.');
    } catch(error:any) {
      setMessages(prev=>prev.filter(m=>m.id!==temporary));
      if(!controller.signal.aborted)showToast(error.message || 'Response failed. Please retry.','error');
    } finally {if(controllerRef.current===controller)setLoading(false);}
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copied response to clipboard', 'success');
  };

  const handleBookmark = async (messageId: string) => {
    try {
      const res = await api.bookmarkMessage(messageId);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, bookmarked: res.bookmarked } : m))
      );
      showToast(res.bookmarked ? 'Message bookmarked!' : 'Bookmark removed', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const exportChat = () => {
    const chatContent = messages
      .map(m => `### ${m.role === 'user' ? 'Student' : 'AI Tutor'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---`)
      .join('\n\n');

    const blob = new Blob([chatContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-sniper-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat transcript exported as Markdown!', 'success');
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 animate-fade-in">
      {/* Left Chat History List */}
      <div className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col shrink-0 shadow-sm">
      <div className="p-3 border-b border-slate-700"><SourceSelect value={documentId} onChange={setDocumentId}/><p className="text-xs text-slate-400">Answers use only this source; ask specific questions for reliable retrieval.</p></div>
        <button
          onClick={handleCreateNewChat}
          className="w-full py-2.5 px-3 mb-3 bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-md  flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> New AI Session
        </button>

        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">Recent Sessions</div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {chats.map(c => {
            const isActive = c.id === activeChatId;
            return (
              <div
                key={c.id}
                onClick={() => {controllerRef.current?.abort();setActiveChatId(c.id);}}
                className={`w-full p-2.5 rounded-xl text-xs font-medium cursor-pointer transition flex items-center justify-between group ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-600/20 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={e => handleDeleteChat(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden relative shadow-sm">
        {/* Chat Header Controls */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Study tutor
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20 dark:border-emerald-500/30">
                  Configured AI model
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Answers grounded in your selected source</div>
            </div>
          </div>

          {/* Persona selector & Export */}
          <div className="flex items-center gap-2">
            <select
              value={persona}
              onChange={e => setPersona(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={exportChat}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              title="Export Chat as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-600/30 border border-teal-500/20 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-300 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-4 rounded-lg text-xs sm:text-sm leading-relaxed space-y-2 relative group ${
                    isUser
                      ? 'bg-teal-700 text-white shadow-md '
                      : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="markdown-body">
                      {msg.content ? (
                        <Markdown>{msg.content}</Markdown>
                      ) : (
                        loading && <span className="text-slate-400 italic">Typing explanation...</span>
                      )}
                    </div>
                  )}

                  {!isUser && msg.content && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBookmark(msg.id)}
                          className={`p-1 hover:text-teal-600 dark:hover:text-teal-300 transition ${msg.bookmarked ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}
                          title="Bookmark message"
                        >
                          <Bookmark className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="p-1 hover:text-white transition"
                          title="Copy message text"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleSend(`Regenerate and expand on this previous explanation: ${msg.content.slice(0, 100)}`)}
                          className="p-1 hover:text-teal-300 transition"
                          title="Regenerate / Expand"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Pills */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestedPrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sp)}
                className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-slate-800/80 hover:bg-teal-100 dark:hover:bg-slate-800 border border-teal-200 dark:border-teal-500/20 text-xs text-teal-700 dark:text-teal-300 transition text-left"
              >
                 {sp}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 focus-within:border-teal-500 rounded-lg px-4 py-2 transition shadow-sm"
          >
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask Sniper AI anything about your studies or upload a prompt..."
              className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 transition shadow-md "
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/context/AuthContext.tsx

Default new users to light mode while preserving their saved theme preference.

````
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TabType } from '../types';
import { api } from '../services/api';
import { auth, signOut } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  toast: { message: string; type?: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  deleteAccount: (data:{password?:string;idToken?:string}) => Promise<void>;
  touchStreak: () => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password';
  setAuthModalMode: (mode: 'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password') => void;
  pendingEmail: string;
  setPendingEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('studysniper_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('studysniper_theme');
    return saved ? saved === 'dark' : false; // Default to the light study workspace; preserve saved preferences.
  });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password'>('login');
  const [pendingEmail, setPendingEmail] = useState('');

  // Automatic logout on inactivity (15 minutes)
  useEffect(() => {
    if (!token || !user) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 mins

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        api.logoutApi().catch(() => {});
        if(auth) signOut(auth).catch(() => {});
        localStorage.removeItem('studysniper_token');
        setToken(null);
        setUser(null);
        showToast('You have been logged out due to inactivity for session security.', 'info');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [token, user]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('studysniper_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('studysniper_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Auth validation failed:', err);
        localStorage.removeItem('studysniper_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();

  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('studysniper_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setAuthModalOpen(false);
    showToast(`Welcome back, ${newUser.name}! `, 'success');
  };

  const logout = () => {
    void api.logoutApi().catch(() => showToast('Local session cleared; server logout failed. Other sessions expire within two hours.', 'error'));
    if(auth) void signOut(auth);
    localStorage.removeItem('studysniper_token');
    setToken(null);setUser(null);setActiveChatId(null);setActiveTab('dashboard');
  };
  useEffect(()=>{
    const expire=()=>{localStorage.removeItem('studysniper_token');setToken(null);setUser(null);setActiveChatId(null);if(auth) void signOut(auth);showToast('Session expired. Please sign in again.','info');};
    window.addEventListener('studysniper-session-expired',expire);
    return ()=>window.removeEventListener('studysniper-session-expired',expire);
  },[]);

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  const deleteAccount = async (data:{password?:string;idToken?:string}) => {
    try {
      await api.deleteAccount(data);
      if(auth) await signOut(auth);
      setActiveChatId(null);
      localStorage.removeItem('studysniper_token');
      setToken(null);
      setUser(null);
      setActiveTab('dashboard');
      showToast('Account deleted successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
      throw err;
    }
  };

  const touchStreak = async () => {
    try {
      const res = await api.incrementStreak();
      if (res.user) {
        setUser(res.user);
      }
    } catch {
      // silent background update
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        darkMode,
        toggleDarkMode,
        activeTab,
        setActiveTab,
        activeChatId,
        setActiveChatId,
        toast,
        showToast,
        login,
        logout,
        updateUser,
        deleteAccount,
        touchStreak,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        pendingEmail,
        setPendingEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

````

## /workspace/scratch/3acea0dbcacf/study-sniper/src/index.css

Define the warm neutral and teal design system, responsive layouts, typography and consistent component surfaces.

````
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  :root {
    color-scheme: light dark;
  }

  html.dark {
    color-scheme: dark;
  }

  html:not(.dark) {
    color-scheme: light;
  }

  body {
    background-color: var(--color-slate-50, #f8fafc);
    color: var(--color-slate-900, #0f172a);
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  html.dark body {
    background-color: var(--color-slate-950, #020617);
    color: var(--color-slate-100, #f8fafc);
  }
}

.markdown-body {
  line-height: 1.6;
}
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  font-weight: 700;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  color: inherit;
}
.markdown-body h1 { font-size: 1.1rem; }
.markdown-body h2 { font-size: 1.0rem; }
.markdown-body h3 { font-size: 0.925rem; }
.markdown-body p {
  margin-bottom: 0.5rem;
}
.markdown-body p:last-child {
  margin-bottom: 0;
}
.markdown-body ul {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.markdown-body ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.markdown-body li {
  margin-bottom: 0.25rem;
}
.markdown-body strong {
  font-weight: 600;
}
.markdown-body code {
  background-color: rgba(148, 163, 184, 0.18);
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.85em;
}
.markdown-body pre {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.markdown-body pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}
.markdown-body blockquote {
  border-left: 3px solid #23786a;
  padding-left: 0.75rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
  font-style: italic;
}

:where(button, a, input, select, textarea, summary):focus-visible {
  outline: 3px solid #10b981;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}

/* Study desk: warm neutrals, quiet teal, consistent surfaces. */
@theme {
 --font-sans: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
 --color-slate-50:#f7f7f2; --color-slate-100:#eeefe8; --color-slate-200:#dddfd6;
 --color-slate-300:#c5cbc1; --color-slate-400:#89958e; --color-slate-500:#65736c;
 --color-slate-600:#4e5e56; --color-slate-700:#394a42; --color-slate-800:#293b33;
 --color-slate-900:#192b23; --color-slate-950:#101c17;
 --color-teal-50:#eef6f2; --color-teal-100:#dceee5; --color-teal-200:#b9dacb;
 --color-teal-300:#94c7b2; --color-teal-400:#6ab498; --color-teal-500:#398e75;
 --color-teal-600:#287e67; --color-teal-700:#206552; --color-teal-800:#1c5143; --color-teal-900:#173f35;
}
:root {--desk-bg:#f7f7f2;--desk-surface:#fff;--desk-ink:#21382e;--desk-muted:#647269;--desk-border:#dce1d7;--desk-soft:#edf2eb;--desk-accent:#206552;}
html.dark {--desk-bg:#101c17;--desk-surface:#192b23;--desk-ink:#edf1e9;--desk-muted:#adbbb1;--desk-border:#35493e;--desk-soft:#24392e;--desk-accent:#94c7b2;}
body {margin:0;font-family:var(--font-sans);-webkit-font-smoothing:antialiased;}
button,a,input,textarea,select { -webkit-tap-highlight-color:transparent; }
button:not(:disabled),summary {cursor:pointer;}
:where(button,a,input,select,textarea,summary):focus-visible {outline:2px solid #398e75;outline-offset:4px;}
.wordmark {display:inline-flex;align-items:center;gap:10px;font-size:20px;font-weight:750;letter-spacing:-.8px;color:inherit;text-decoration:none;}
.eyebrow {font-size:10px;font-weight:700;letter-spacing:.15em;color:var(--desk-muted);line-height:1.6;}
.primary-action {display:inline-flex;align-items:center;justify-content:center;gap:15px;background:#206552;color:#fff;padding:14px 20px;border:1px solid #206552;border-radius:6px;font-size:13px;font-weight:600;white-space:normal;transition:background .18s;}
.primary-action:hover {background:#173f35;}
.text-action {display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;}
.quiet-note {font-size:11px;color:var(--desk-muted);line-height:1.7;}
.editorial-landing {--desk-muted:#647269;background:#f7f7f2;color:#21382e;min-height:100vh;}
.landing-nav {height:88px;max-width:1240px;margin:auto;padding:0 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce1d7;position:relative;}
.brand-dot {color:#398e75;}
.landing-links {display:flex;align-items:center;gap:34px;font-size:13px;font-weight:500;}
.landing-links button {display:flex;align-items:center;gap:10px;border:1px solid #b9c4b9;padding:10px 16px;border-radius:5px;}
.landing-links a:hover {text-decoration:underline;text-underline-offset:5px;}
.landing-menu {display:none;}
.landing-hero {max-width:1240px;margin:auto;display:grid;grid-template-columns:1.15fr 1fr;gap:75px;align-items:center;padding:90px 40px 80px;}
.hero-copy .eyebrow {display:flex;align-items:center;gap:8px;font-size:10px;}
.status-dot {height:6px;width:6px;background:#398e75;border-radius:50%;}
.hero-copy h1 {font-size:clamp(40px,4.3vw,62px);font-weight:650;line-height:1.08;letter-spacing:-2.8px;margin:24px 0;}
.hero-copy h1 em {font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:-2px;color:#39735c;}
.hero-description {font-size:15px;line-height:1.85;color:#65736c;max-width:450px;}
.hero-actions {display:flex;flex-wrap:wrap;align-items:center;gap:20px;margin:28px 0 16px;}
.plan-preview {background:#fff;border:1px solid #d5ded1;border-radius:9px;box-shadow:0 14px 40px #263a2910;overflow:hidden;transform:rotate(-1deg);}
.preview-top {padding:20px 24px;display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #e6e9e1;}
.preview-tag {font-size:9px;padding:3px 7px;background:#eef2e9;color:#54674f;border-radius:3px;white-space:nowrap;}
.preview-heading {display:flex;align-items:center;justify-content:space-between;padding:27px 24px 20px;gap:10px;}
.preview-heading h2 {font-family:Georgia,serif;font-size:27px;letter-spacing:-.6px;}
.preview-heading>span {font-size:17px;text-align:right;line-height:1.15;font-variant-numeric:tabular-nums;}
.preview-heading small {font-size:9px;color:#647269;}
.preview-row {display:flex;align-items:flex-start;gap:17px;padding:22px 24px;border-bottom:1px solid #eef0ea;}
.preview-time {font:11px monospace;color:#7e8980;padding-top:4px;}
.preview-row>div {flex:1;}
.preview-category {font-size:8px;letter-spacing:.14em;font-weight:700;color:#6c7f64;}
.preview-row h3 {font-size:14px;font-weight:650;margin:5px 0;}
.preview-row p {font-size:11px;line-height:1.6;color:#6d786f;}
.preview-row>svg {color:#66826c;margin-top:17px;}
.preview-footer {padding:16px 24px;background:#eef3e9;display:flex;gap:9px;align-items:center;font-size:10px;color:#4c674c;}
.landing-principles {max-width:1160px;margin:auto;border-top:1px solid #dce1d7;border-bottom:1px solid #dce1d7;display:flex;justify-content:space-between;padding:24px 0;gap:20px;}
.landing-principles span {display:flex;align-items:center;gap:12px;font-size:12px;color:#56664d;}
.method-section {max-width:1240px;padding:85px 40px;margin:auto;}
.section-intro h2,.workspace-section h2 {font-size:clamp(25px,3vw,35px);letter-spacing:-1.2px;line-height:1.25;margin:14px 0 35px;font-weight:550;}
.method-grid {display:grid;grid-template-columns:repeat(3,1fr);gap:45px;}
.method-grid article {border-top:1px solid #cdd7c7;padding-top:18px;}
.method-number {font-family:Georgia,serif;font-size:29px;color:#839278;}
.method-grid h3 {font-size:17px;font-weight:600;margin:18px 0 10px;}
.method-grid p {font-size:13px;line-height:1.8;color:#647269;}
.workspace-section {max-width:1160px;margin:0 auto 75px;padding:48px;background:#e9eee2;display:grid;grid-template-columns:1.2fr 1fr;gap:70px;border-radius:8px;}
.workspace-section h2 {margin-bottom:15px;}.workspace-section p:not(.eyebrow) {font-size:14px;line-height:1.8;color:#596950;margin-bottom:25px;}.workspace-section ul {align-self:center;}.workspace-section li {display:flex;gap:15px;align-items:center;padding:17px 0;font-size:13px;border-bottom:1px solid #cfd9c7;}
.landing-footer {max-width:1160px;margin:auto;padding:25px 0 35px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid #dce1d7;font-size:11px;color:#65736c;}.landing-footer .wordmark {font-size:16px;color:#21382e;}.landing-footer button {display:flex;align-items:center;gap:8px;}
.study-sidebar {position:fixed;inset:0 auto 0 0;width:256px;z-index:40;background:var(--desk-surface);border-right:1px solid var(--desk-border);display:flex;flex-direction:column;color:var(--desk-ink);transition:transform .2s;}
.sidebar-brand {height:80px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 23px;}.sidebar-brand .wordmark {font-size:19px;}.sidebar-nav {padding:10px 15px;overflow-y:auto;flex:1;}.nav-group {margin:10px 0 28px;}.nav-group>p {font-size:9px;letter-spacing:.15em;font-weight:650;color:var(--desk-muted);padding:0 12px;margin-bottom:12px;}.nav-link {display:flex;align-items:center;gap:12px;width:100%;padding:12px;border-radius:5px;font-size:12px;color:var(--desk-muted);margin:2px 0;text-align:left;}.nav-link:hover {background:var(--desk-soft);color:var(--desk-ink);}.nav-link.active {background:var(--desk-soft);color:var(--desk-accent);font-weight:650;}.nav-active-dot {width:5px;height:5px;border-radius:50%;background:currentColor;margin-left:auto;}.sidebar-bottom {padding:15px;border-top:1px solid var(--desk-border);}.sidebar-note {padding:12px 12px 20px;}.sidebar-note strong {display:block;font-size:15px;font-weight:600;margin:8px 0 5px;}.sidebar-note p {font-size:11px;color:var(--desk-muted);}
.dashboard-layout {display:flex;flex-direction:column;gap:28px;padding-bottom:35px;}.desk-heading {display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:12px 0 6px;}.desk-heading h1 {font-size:clamp(27px,3vw,40px);font-weight:550;letter-spacing:-1.5px;line-height:1.2;margin:12px 0;}.desk-heading h1 span {color:var(--desk-muted);}.desk-heading>div>p:last-child {font-size:13px;color:var(--desk-muted);}.desk-metrics {display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--desk-border);border-radius:8px;background:var(--desk-surface);}.desk-metrics>div {padding:22px;border-right:1px solid var(--desk-border);}.desk-metrics>div:last-child {border:0;}.desk-metrics p {font-size:11px;color:var(--desk-muted);}.desk-metrics strong {display:block;font-size:30px;letter-spacing:-1px;font-weight:550;margin:8px 0;}.desk-metrics small {font-size:12px;font-weight:400;margin-left:7px;color:var(--desk-muted);letter-spacing:0;}.desk-metrics span {font-size:10px;color:var(--desk-muted);}.desk-bottom {display:grid;grid-template-columns:1.2fr 1fr;gap:24px;}.desk-panel {background:var(--desk-surface);border:1px solid var(--desk-border);border-radius:8px;padding:24px;min-width:0;}.panel-heading {display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:20px;}.panel-heading h2 {font-size:20px;font-weight:550;letter-spacing:-.6px;margin-top:6px;}.desk-tool {display:flex;align-items:center;width:100%;gap:14px;text-align:left;padding:15px 0;border-top:1px solid var(--desk-border);color:var(--desk-ink);}.desk-tool>span {flex:1;}.desk-tool strong {display:block;font-size:12px;font-weight:600;}.desk-tool small {display:block;font-size:10px;color:var(--desk-muted);margin-top:5px;}.desk-tool:hover strong {color:var(--desk-accent);}.desk-error {padding:14px;border:1px solid #d5a7a2;border-radius:5px;font-size:13px;}.desk-error button {text-decoration:underline;}
@media(max-width:1023px){.study-sidebar{transform:translateX(-100%);}.study-sidebar.is-open{transform:translateX(0);}.landing-hero{gap:35px;padding-top:55px;}.landing-principles,.landing-footer{margin-left:40px;margin-right:40px;}.workspace-section{margin-left:40px;margin-right:40px;gap:35px;padding:30px;}}
@media(max-width:700px){.landing-nav{height:72px;padding:0 22px;}.landing-menu{display:block;}.landing-links{display:none;}.landing-links.is-open{display:flex;position:absolute;top:72px;left:0;right:0;padding:20px;gap:20px;background:#f7f7f2;border-bottom:1px solid #dce1d7;z-index:10;flex-wrap:wrap;}.landing-hero{grid-template-columns:1fr;padding:45px 22px;gap:40px;}.hero-copy h1{font-size:43px;letter-spacing:-2px;}.hero-copy h1 em{letter-spacing:-1.6px;}.plan-preview{transform:none;}.hero-actions{gap:18px;}.landing-principles{margin:0 22px;flex-direction:column;padding:22px;gap:18px;}.method-section{padding:50px 22px;}.method-grid{grid-template-columns:1fr;gap:30px;}.method-grid article{display:block;}.workspace-section{margin:0 22px 45px;padding:25px;grid-template-columns:1fr;gap:12px;}.landing-footer{margin:0 22px;flex-wrap:wrap;}.desk-heading{align-items:flex-start;flex-direction:column;gap:18px;}.desk-metrics{grid-template-columns:repeat(2,1fr);}.desk-metrics>div{padding:16px;}.desk-metrics>div:nth-child(2){border-right:0;}.desk-metrics>div:nth-child(-n+2){border-bottom:1px solid var(--desk-border);}.desk-bottom{grid-template-columns:1fr;}.desk-panel{padding:20px;}.dashboard-layout{gap:22px;}}
.readiness-panel {padding:24px;border-color:var(--desk-border);}
.readiness-table th {font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--desk-muted);font-weight:600;padding-top:18px;padding-bottom:12px;}
.readiness-table td {padding-top:13px;padding-bottom:13px;}
.readiness-panel>div>div:first-child {flex-wrap:wrap;}

````
