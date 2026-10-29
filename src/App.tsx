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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-purple-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-purple-500 selection:text-white transition-colors duration-200">
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
