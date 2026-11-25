import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // --- Auth ---
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // --- Profile ---
  const [displayName, setDisplayName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gradeHandled, setGradeHandled] = useState('');

  // --- UI / environment ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- Auth mode: 'login' | 'register' | 'forgot' | 'recovery' ---
  const [authMode, setAuthMode] = useState('login');

  // --- Theme effect ---
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- Online/offline effect ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Fetch profile by user id ---
  const fetchUserProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, display_name, school_name, grade_handled')
      .eq('id', userId)
      .single();

    if (data) {
      setUserRole(data.role);
      setDisplayName(data.display_name || data.role);
      setSchoolName(data.school_name || '');
      setGradeHandled(data.grade_handled || '');
    }
  }, []);

  // --- Auth subscription ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('recovery');
      }
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserRole(null);
        setDisplayName('');
        setSchoolName('');
        setGradeHandled('');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // --- Logout ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setSession(null);
    setDisplayName('');
    setSchoolName('');
    setGradeHandled('');
  };

  // --- Save profile (also updates local context state) ---
  const saveProfile = async (updates) => {
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (error) {
      console.error('saveProfile error:', error);
      return;
    }

    if (updates.display_name !== undefined) setDisplayName(updates.display_name);
    if (updates.school_name !== undefined) setSchoolName(updates.school_name);
    if (updates.grade_handled !== undefined) setGradeHandled(updates.grade_handled);
  };

  const value = {
    // auth
    session,
    userRole,
    authMode,
    setAuthMode,
    handleLogout,
    // profile
    displayName,
    schoolName,
    gradeHandled,
    saveProfile,
    // ui
    theme,
    setTheme,
    isOnline,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};