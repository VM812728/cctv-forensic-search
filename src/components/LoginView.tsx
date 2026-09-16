import React, { useState } from 'react';
import { 
  ScanFace, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Video, 
  Film, 
  Scissors, 
  FolderKanban, 
  Users, 
  ShieldCheck, 
  KeyRound, 
  Fingerprint, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Camera,
  Layers,
  Search,
  Sparkles
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
          setFeedbackMessage({ type: 'error', text: 'Please provide both official email address and password.' });
          setIsSubmitting(false);
          return;
        }
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          setFeedbackMessage({ type: 'error', text: 'Please fill in all required fields (Full Officer Name, Email, Password).' });
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setFeedbackMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setFeedbackMessage({ type: 'error', text: 'Passwords do not match. Please verify confirmed password.' });
          setIsSubmitting(false);
          return;
        }
        await signUpWithEmail(fullName.trim(), email.trim(), password, mobileNumber.trim(), selectedRole);
        setFeedbackMessage({
          type: 'success',
          text: 'Registration request submitted. Your account is pending administrator verification. Application access will activate upon approval.'
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
        text: err instanceof Error ? err.message : 'Google Workspace authentication failed.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6 Core capabilities for the feature strip
  const featureStrip = [
    {
      title: 'Candidate Search',
      description: 'Biometric matching',
      icon: ScanFace,
    },
    {
      title: 'CCTV Indexing',
      description: 'Automated ingest',
      icon: Video,
    },
    {
      title: 'Evidence Clips',
      description: 'Forensic extraction',
      icon: Scissors,
    },
    {
      title: 'Case Management',
      description: 'Audit trail tracking',
      icon: FolderKanban,
    },
    {
      title: 'User Management',
      description: 'Role-based control',
      icon: Users,
    },
    {
      title: 'Secure & Compliant',
      description: 'Air-gapped SHA-256',
      icon: ShieldCheck,
    },
  ];

  return (
    <div 
      id="innovatiview-login-screen" 
      className="min-h-screen w-full bg-[#f8fafc] text-slate-800 font-sans antialiased relative flex flex-col justify-between overflow-x-hidden selection:bg-[#0B2545] selection:text-white"
    >
      {/* Background Decorative Architecture inspired by the visual reference */}
      {/* 1. Subtle blue gradient waves in the bottom left */}
      <div 
        className="absolute bottom-0 left-0 w-[55%] h-[60%] pointer-events-none opacity-20 lg:opacity-30 -z-0"
        style={{
          background: 'radial-gradient(ellipse at bottom left, #0B2545 0%, #0055aa 35%, transparent 70%)',
        }}
      />
      {/* 2. Modern wave curve overlay SVG on bottom left */}
      <svg 
        className="absolute bottom-0 left-0 w-[45vw] max-w-[650px] pointer-events-none -z-0 opacity-15"
        viewBox="0 0 700 400" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M 0 400 C 150 360 220 220 380 200 C 520 180 580 80 700 0 L 0 0 Z" 
          fill="url(#waveGrad)" 
          transform="matrix(1 0 0 -1 0 400)" 
        />
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="700" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B2545" stopOpacity="0.8" />
            <stop offset="0.5" stopColor="#0252a6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* 3. Subtle grid lines pattern for surveillance workstation feel */}
      <div 
        className="absolute inset-0 pointer-events-none -z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#0B2545 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Bar / Status Strip */}
      <header className="w-full px-6 py-3.5 flex items-center justify-between border-b border-slate-200/70 bg-white/75 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <img 
            src="/Inno logo.png" 
            alt="Innovatiview - BE DISTINCT" 
            className="h-7 sm:h-8 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/inno-logo.png';
            }}
          />
          <div className="hidden sm:block h-4 w-px bg-slate-300 mx-1" />
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Forensic Investigation System
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Air-Gapped</span> Offline Station
          </div>
          <div className="text-[11px] text-slate-400 font-mono hidden md:block">
            Build 2026.09-PROD
          </div>
        </div>
      </header>

      {/* Main Content Area: Two Columns (Left: Brand & Product & Feature Strip; Right: Floating Login Card) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 z-10">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Primary Brand, Product Heading, Tagline, CCTV Security Graphic, Feature Strip */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-7">
            
            {/* 1. Primary Dominant Brand Header */}
            <div>
              <div className="inline-block">
                <img 
                  src="/Inno logo.png" 
                  alt="Innovatiview - BE DISTINCT" 
                  className="h-11 sm:h-14 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/innovatiview-logo.png';
                  }}
                />
              </div>

              {/* Product Title */}
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-[#0B2545] tracking-tight leading-[1.15] mt-5">
                CCTV Candidate Search <br />
                <span className="text-[#0252a6]">&amp; Forensic Evidence Workstation</span>
              </h1>

              {/* Tagline */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <p className="text-base sm:text-lg font-bold text-[#0066cc] tracking-wide">
                  Search • Match • Extract • Preserve
                </p>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-100/70 text-[#0B2545] font-semibold">
                  AI-Assisted Investigation
                </span>
              </div>
            </div>

            {/* Subtle CCTV Security & Surveillance Motif Display */}
            <div className="relative rounded-2xl overflow-hidden border border-blue-100 bg-gradient-to-r from-blue-900/90 to-slate-900 text-white p-5 shadow-lg shadow-blue-900/10">
              <div 
                className="absolute inset-0 opacity-25 mix-blend-overlay bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: "url('/cctv-surveillance.jpg')" }}
              />
              
              {/* Surveillance Overlay Lines */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
                    <Camera className="w-6 h-6 text-cyan-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-semibold tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      SECURE EXAMINATION SURVEILLANCE
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-md leading-relaxed">
                      Dense temporal verification with local YuNet &amp; SFace embedding models. Zero cloud video exposure.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end shrink-0 text-right font-mono text-[11px] text-slate-300 border-l border-white/10 pl-4">
                  <span className="text-emerald-400 font-semibold">SHA-256 SEALED</span>
                  <span className="text-slate-400">FPS: 24.0 • 1080P</span>
                  <span className="text-cyan-300">PASS 1 + PASS 2</span>
                </div>
              </div>
            </div>

            {/* Feature Strip: 6 Capabilities */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 font-mono">
                System Capabilities
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {featureStrip.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-300 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0B2545] truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Floating Enterprise Login Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div 
              id="login-card"
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-300/60 border border-slate-200/90 p-6 sm:p-8 relative overflow-hidden"
            >
              {/* Subtle top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0B2545] via-[#0252a6] to-[#38bdf8]" />

              {/* Card Header & Brand Logo */}
              <div className="text-center pt-2 mb-6">
                <img 
                  src="/Inno logo.png" 
                  alt="Innovatiview" 
                  className="h-8 w-auto mx-auto object-contain mb-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/inno-logo.png';
                  }}
                />
                
                {/* Secondary Developer Credit */}
                <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-3">
                  Developed by VM
                </div>

                <h2 className="text-2xl font-bold text-[#0B2545] tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sign in to access the forensic workstation
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
                <button
                  type="button"
                  id="tab-signin"
                  onClick={() => {
                    setMode('signin');
                    setFeedbackMessage(null);
                    clearAuthError();
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-[#0B2545] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  id="tab-signup"
                  onClick={() => {
                    setMode('signup');
                    setFeedbackMessage(null);
                    clearAuthError();
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-[#0B2545] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
                <button
                  type="button"
                  id="tab-forgot"
                  onClick={() => {
                    setMode('forgot');
                    setFeedbackMessage(null);
                    clearAuthError();
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'forgot'
                      ? 'bg-[#0B2545] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Feedback / Error Alerts */}
              {(authError || feedbackMessage) && (
                <div
                  className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    feedbackMessage?.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {feedbackMessage?.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <div className="flex-1 leading-relaxed">
                    {feedbackMessage?.text || authError}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full name for registration */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Officer Name *
                    </label>
                    <input
                      type="text"
                      id="input-fullname"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Inspector Vishal Sharma"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0B2545] focus:bg-white focus:ring-1 focus:ring-[#0B2545] transition-all"
                    />
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      id="input-email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@examination-agency.gov.in"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0B2545] focus:bg-white focus:ring-1 focus:ring-[#0B2545] transition-all"
                    />
                  </div>
                </div>

                {/* Password field (hidden in forgot password mode) */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Password * {mode === 'signup' && <span className="text-[10px] text-slate-400 font-normal">(min 6 chars)</span>}
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          id="btn-forgot-link"
                          onClick={() => {
                            setMode('forgot');
                            setFeedbackMessage(null);
                          }}
                          className="text-[11px] text-[#0066cc] hover:underline transition-colors cursor-pointer font-medium"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="input-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter security password"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0B2545] focus:bg-white focus:ring-1 focus:ring-[#0B2545] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Password for Registration */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="input-confirm-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter security password"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0B2545] focus:bg-white focus:ring-1 focus:ring-[#0B2545] transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Number for Registration */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile / Contact Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0B2545] focus:bg-white focus:ring-1 focus:ring-[#0B2545] transition-all"
                    />
                  </div>
                )}

                {/* Remember Me Checkbox on Sign-in */}
                {mode === 'signin' && (
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] w-3.5 h-3.5"
                      />
                      <span>Remember me</span>
                    </label>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  id="btn-submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0B2545] hover:bg-[#07192f] text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : mode === 'signin' ? (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <span>Submit Officer Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Federated Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono">
                  <span className="bg-white px-3 text-slate-400">OR</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                id="btn-google-signin"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
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
                <span>Google Sign-In</span>
              </button>

              {/* Card Bottom Security Badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Secure • Trusted • Innovatiview</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Strip */}
      <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-20">
        <div className="flex items-center gap-2 font-medium">
          <Fingerprint className="w-3.5 h-3.5 text-[#0252a6]" />
          <span>Local YuNet + SFace Biometrics</span>
          <span className="text-slate-300">•</span>
          <span className="hidden md:inline">Air-Gapped Workstation</span>
        </div>

        {/* DEVELOPER CREDIT (Subtle secondary credit as required) */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>Developed by VM</span>
          <span>•</span>
          <span>© 2026 Innovatiview</span>
        </div>
      </footer>
    </div>
  );
};
