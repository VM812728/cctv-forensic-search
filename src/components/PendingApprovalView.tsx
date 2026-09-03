import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  ScanFace, 
  Shield, 
  Mail, 
  User, 
  Phone, 
  Calendar, 
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { User as AppUser } from '../types';

interface PendingApprovalViewProps {
  user: AppUser;
  onSignOut: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  user,
  onSignOut,
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      await onRefresh();
      setRefreshMessage('Account status re-checked. Verification in progress with administrator.');
    } catch {
      setRefreshMessage('Could not connect to verify status. Please try again.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-12 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <ScanFace className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-bold text-xs tracking-wider uppercase text-slate-200 font-mono">
            Examination Forensic Portal • Verification Gate
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            STATUS: PENDING ADMIN APPROVAL
          </span>
          <button
            onClick={() => onSignOut()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Center Status Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-xl bg-slate-900/80 border border-amber-500/30 rounded-2xl shadow-2xl backdrop-blur-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle glow border top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 opacity-90" />

          {/* Status Icon & Main Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 mb-3.5 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
              STATUS: PENDING ADMIN APPROVAL
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Registration Request Under Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-md mx-auto">
              Your registration request has been submitted successfully.
              Your account is currently pending administrator approval.
            </p>
          </div>

          {/* Notice Box */}
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-semibold block mb-0.5">Administrator Review Mandatory</strong>
                Your account registration request has been sent to the administrator.
                Please wait until your account is reviewed and approved.
                You will be able to access the system once your account has been activated and your official User ID is issued.
              </div>
            </div>
          </div>

          {/* Registration Details Summary */}
          <div className="bg-slate-950/60 border border-white/10 rounded-xl p-4 space-y-3 mb-6 font-mono text-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans border-b border-white/5 pb-1">
              Officer Registration Dossier
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400 font-sans">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Full Name:</span>
              </span>
              <span className="font-semibold text-white">{user.fullName || user.username}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400 font-sans">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Email Address:</span>
              </span>
              <span className="text-slate-200">{user.email || 'N/A'}</span>
            </div>
            {user.mobileNumber && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2 text-slate-400 font-sans">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Contact Mobile:</span>
                </span>
                <span className="text-slate-200">{user.mobileNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400 font-sans">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>User ID:</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                PENDING ACTIVATION
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400 font-sans">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Requested On:</span>
              </span>
              <span className="text-slate-400">{user.createdAt || new Date().toISOString().substring(0, 10)}</span>
            </div>
          </div>

          {refreshMessage && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 text-center font-mono">
              {refreshMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'CHECKING STATUS...' : 'CHECK APPROVAL STATUS'}</span>
            </button>

            <button
              onClick={() => onSignOut()}
              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Security Notice */}
      <footer className="h-10 border-t border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 text-[11px] text-slate-400 z-20">
        <div className="flex items-center gap-2 font-mono">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Zero Unapproved Access • Role-Based Forensic Security</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-500">
          <span>Protected by Firebase Rules</span>
        </div>
      </footer>
    </div>
  );
};
