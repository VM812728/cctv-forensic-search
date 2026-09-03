import React from 'react';
import { 
  ShieldX, 
  LogOut, 
  ScanFace, 
  Shield, 
  Mail, 
  User, 
  AlertOctagon,
  Calendar,
  Phone
} from 'lucide-react';
import { User as AppUser } from '../types';

interface RejectedAccountViewProps {
  user: AppUser;
  onSignOut: () => Promise<void>;
}

export const RejectedAccountView: React.FC<RejectedAccountViewProps> = ({
  user,
  onSignOut
}) => {
  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-slate-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-12 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
            <ScanFace className="w-4 h-4 text-rose-400" />
          </div>
          <span className="font-bold text-xs tracking-wider uppercase text-slate-200 font-mono">
            Examination Forensic Portal • Access Restricted
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            STATUS: REGISTRATION REJECTED
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
        <div className="w-full max-w-xl bg-slate-900/80 border border-rose-500/30 rounded-2xl shadow-2xl backdrop-blur-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle glow border top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-400 opacity-90" />

          {/* Status Icon & Main Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 mb-3.5 shadow-[0_0_30px_rgba(244,63,94,0.25)]">
              <ShieldX className="w-8 h-8 text-rose-400" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
              STATUS: REGISTRATION REJECTED
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Application Not Approved
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-md mx-auto">
              Your registration request has not been approved.
              Please contact the system administrator.
            </p>
          </div>

          {/* Reason Box */}
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300 font-semibold block mb-0.5">Decision Note from Administrator:</strong>
                <p className="mt-1 text-slate-300 font-mono text-[11px]">
                  {user.rejectionReason || 'No specific reason was entered. Please verify credentials with your testing agency supervisory authority.'}
                </p>
              </div>
            </div>
          </div>

          {/* Registration Details Summary */}
          <div className="bg-slate-950/60 border border-white/10 rounded-xl p-4 space-y-3 mb-6 font-mono text-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans border-b border-white/5 pb-1">
              Recorded Registration Details
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400 font-sans">
                <User className="w-3.5 h-3.5 text-rose-400" />
                <span>Full Name:</span>
              </span>
              <span className="font-semibold text-white">{user.fullName || user.username}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400 font-sans">
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                <span>Email Address:</span>
              </span>
              <span className="text-slate-200">{user.email || 'N/A'}</span>
            </div>
            {user.rejectedAt && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2 text-slate-400 font-sans">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <span>Decision Date:</span>
                </span>
                <span className="text-slate-400">{user.rejectedAt}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => onSignOut()}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-300" />
            <span>SIGN OUT / RETURN TO LOGIN</span>
          </button>
        </div>
      </main>

      {/* Footer Security Notice */}
      <footer className="h-10 border-t border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 text-[11px] text-slate-400 z-20">
        <div className="flex items-center gap-2 font-mono">
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <span>Restricted Forensic Network • Access Prohibited for Unapproved Users</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-500">
          <span>Logged to Audit Trail</span>
        </div>
      </footer>
    </div>
  );
};
