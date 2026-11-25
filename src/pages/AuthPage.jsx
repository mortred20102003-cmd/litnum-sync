import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';

// IMPORT THE LOGOS HERE
import mbhteLogo from '../assets/mbhte-logo.png';
import tawiLogo from '../assets/tawi-tawi-logo.png';

export default function AuthPage() {
  const { authMode, setAuthMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const reset = () => { setAuthError(''); setAuthSuccess(''); };

  const handleAuth = async (e) => {
    e.preventDefault();
    reset();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, email, role: 'teacher' }]);
        }
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setAuthSuccess('Password reset link sent! Please check your email.');
      } else if (authMode === 'recovery') {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setAuthSuccess('Password updated successfully!');
        setTimeout(() => {
          setAuthMode('login');
          setNewPassword('');
          reset();
        }, 2000);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#EDF1F7] dark:bg-[#0A111D]">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full">
        
        {/* --- NEW HEADER WITH LOGOS --- */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <img src={mbhteLogo} alt="MBHTE Logo" className="h-16 w-16 object-contain" />
          <div className="text-center">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
              Republic of the Philippines<br/>
              Bangsamoro Autonomous Region<br/>
              Ministry of Basic, Higher and Technical Education
            </h2>
          </div>
          <img src={tawiLogo} alt="Tawi-Tawi Logo" className="h-16 w-16 object-contain" />
        </div>
        
        <div className="text-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-6">
          <h1 className="text-xl font-extrabold text-blue-900 dark:text-white">
            Learner Progress Monitoring Tool
          </h1>
          <p className="text-xs text-gray-500 mt-1">Schools Division of Tawi-Tawi</p>
        </div>
        {/* ------------------------------ */}

        <div className="text-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            {authMode === 'login' && 'Welcome Back'}
            {authMode === 'register' && 'Create an Account'}
            {authMode === 'forgot' && 'Reset Password'}
            {authMode === 'recovery' && 'Set New Password'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            {authMode === 'login' && 'Login to continue to your portal'}
            {authMode === 'register' && 'Sign up to start monitoring'}
            {authMode === 'forgot' && 'Enter your email to receive a reset link'}
            {authMode === 'recovery' && 'Enter your new secure password'}
          </p>
        </div>

        {authError && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4 text-center">
            {authError}
          </div>
        )}
        {authSuccess && (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm mb-4 text-center">
            {authSuccess}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode !== 'recovery' && (
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full pl-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {(authMode === 'login' || authMode === 'register') && (
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {authMode === 'recovery' && (
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                className="w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {authMode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setAuthMode('forgot'); reset(); }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
          >
            {authLoading ? 'Processing...'
              : authMode === 'login' ? 'Login'
              : authMode === 'register' ? 'Register'
              : authMode === 'forgot' ? 'Send Reset Link'
              : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {authMode === 'login' && (
            <button
              onClick={() => { setAuthMode('register'); reset(); }}
              className="text-sm text-gray-500 hover:text-blue-600 block w-full"
            >
              Don't have an account? Sign up
            </button>
          )}
          {authMode === 'register' && (
            <button
              onClick={() => { setAuthMode('login'); reset(); }}
              className="text-sm text-gray-500 hover:text-blue-600 block w-full"
            >
              Already have an account? Login
            </button>
          )}
          {authMode === 'forgot' && (
            <button
              onClick={() => { setAuthMode('login'); reset(); }}
              className="text-sm text-gray-500 hover:text-blue-600 block w-full font-bold"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}