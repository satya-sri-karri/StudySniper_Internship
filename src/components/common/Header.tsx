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
