import React, { useState } from 'react';
import { 
  Shield, 
  ScanFace, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Cpu, 
  KeyRound, 
  Fingerprint,
  Info,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginView: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    authError,
    clearAuthError,
    isLoading
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Auditor');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setFeedbackMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password.trim()) {
          setFeedbackMessage({ type: 'error', text: 'Please provide both email and password.' });
          setIsSubmitting(false);
          return;
        }
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          setFeedbackMessage({ type: 'error', text: 'Please fill in all required fields (Full Name, Email, Password).' });
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setFeedbackMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setFeedbackMessage({ type: 'error', text: 'Passwords do not match. Please re-enter confirm password.' });
          setIsSubmitting(false);
          return;
        }
        await signUpWithEmail(fullName.trim(), email.trim(), password, mobileNumber.trim(), selectedRole);
        setFeedbackMessage({
          type: 'success',
          text: 'Your registration request has been submitted successfully. Your account is currently pending administrator approval. Once your account is approved, your User ID will be activated and you will be able to access the application.'
        });
      } else if (mode === 'forgot') {
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          setFeedbackMessage({ type: 'error', text: 'Please enter a valid registered email address.' });
          setIsSubmitting(false);
          return;
        }
        const message = await resetPassword(trimmedEmail);
        setFeedbackMessage({ type: 'success', text: message });
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Authentication request failed. Please check credentials.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearAuthError();
    setFeedbackMessage(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Google authentication failed.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-12 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
            <ScanFace className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold text-xs tracking-wider uppercase text-slate-200 font-mono">
            Examination Forensic Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Air-Gapped Offline Ready
          </span>
          <span className="text-xs text-slate-500 font-mono">Build 2026.08.30-PROD</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-lg bg-slate-900/70 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle glow border top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 opacity-80" />

          {/* Station Branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mb-3 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              CCTV Candidate Search & Evidence Station
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              AI-Powered CCTV Search & Evidence Management
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950/60 rounded-xl border border-white/10 mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setFeedbackMessage(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setFeedbackMessage(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Officer
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setFeedbackMessage(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'forgot'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reset Key
            </button>
          </div>

          {/* Feedback & Error Alerts */}
          {(authError || feedbackMessage) && (
            <div
              className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                (feedbackMessage?.type === 'success')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {(feedbackMessage?.type === 'success') ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                {feedbackMessage?.text || authError}
              </div>
            </div>
          )}

          {/* Primary Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Officer / User Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Inspector Vishal Sharma"
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile / Contact Number (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@examination-agency.gov.in"
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Password * {mode === 'signup' && <span className="text-[10px] text-slate-400 font-normal">(min 6 chars)</span>}
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setFeedbackMessage(null);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter security password"
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter security password"
                        className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === 'signup' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                <div className="font-semibold text-amber-200 mb-0.5">Admin Approval Required</div>
                Newly registered accounts are submitted to the administrator for review. Application access and your unique User ID are issued upon approval.
              </div>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Remember session on this workstation</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-wide shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>SIGNING IN...</span>
                </>
              ) : mode === 'signin' ? (
                <>
                  <KeyRound className="w-4 h-4 text-blue-200" />
                  <span>SIGN IN TO WORKSTATION</span>
                  <ArrowRight className="w-4 h-4 text-blue-200" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <UserCheck className="w-4 h-4 text-blue-200" />
                  <span>CREATE OFFICER ACCOUNT</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-blue-200" />
                  <span>SEND PASSWORD RESET LINK</span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign In Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-slate-900 px-3 text-slate-500">Or Federated Identity</span>
            </div>
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
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
            <span>Continue with Google Workspace</span>
          </button>
        </div>
      </main>

      {/* Footer Security Notice */}
      <footer className="h-10 border-t border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 text-[11px] text-slate-400 z-20">
        <div className="flex items-center gap-2 font-mono">
          <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
          <span>Local YuNet + SFace Biometrics • Zero Cloud Video Exposure</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-500">
          <span>SHA-256 Audit Sealed</span>
          <span>•</span>
          <span>Role-Based Access Control (Supabase RLS)</span>
        </div>
      </footer>
    </div>
  );
};
