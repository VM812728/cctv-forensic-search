import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  Cpu, 
  FolderKanban, 
  Sparkles,
  WifiOff,
  ChevronDown,
  UserCheck,
  LogOut,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Case, User, SystemHardwareInfo } from '../types';

interface WindowsTitleBarProps {
  currentCase?: Case;
  cases: Case[];
  onSelectCase: (caseId: string) => void;
  currentUser: User;
  systemHardware: SystemHardwareInfo;
  onOpenSystemInfo: () => void;
  onOpenQuickDemo: () => void;
  onLogout?: () => void;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  currentCase,
  cases,
  onSelectCase,
  currentUser,
  systemHardware,
  onOpenSystemInfo,
  onOpenQuickDemo,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      id="windows-title-bar" 
      className="h-10 bg-[#090d16] border-b border-slate-800/80 flex items-center justify-between px-3 select-none z-50 text-xs text-slate-300 shrink-0"
    >
      {/* Left: Product identification & Security badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-300 font-medium">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px] font-bold tracking-wide">CCTV-FORENSIC-WORKSTATION</span>
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        {/* Air-Gapped Offline Badge */}
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
          <WifiOff className="w-3 h-3" />
          <span>Air-Gapped Offline</span>
        </span>

        {/* 1-Click Live Test Case Demo */}
        <button
          id="btn-quick-demo-titlebar"
          onClick={onOpenQuickDemo}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
          title="Load pre-configured examination exam hall candidate scenario"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="font-medium">Quick Test Scenario</span>
        </button>
      </div>

      {/* Center: Active Case Quick Switcher */}
      <div className="flex items-center gap-2">
        <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-400 text-xs">Active Case:</span>
        <select
          id="select-active-case-titlebar"
          value={currentCase?.id || ''}
          onChange={(e) => onSelectCase(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-0.5 font-mono focus:outline-none focus:border-blue-500 max-w-[280px] truncate cursor-pointer"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
              {c.caseCode} — {c.candidate?.candidateName || 'Candidate'} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Right: Hardware Telemetry link, User Pill */}
      <div className="flex items-center gap-3">
        {/* System Health / Telemetry Pill */}
        <button
          id="btn-telemetry-badge"
          onClick={onOpenSystemInfo}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
          title="Click to view System Health Diagnostics in Settings"
        >
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="font-mono text-[11px] text-emerald-400">Health: Online</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-[11px]">GPU {systemHardware.gpuUsagePercent}%</span>
        </button>

        {/* User Pill with Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            id="btn-titlebar-user-pill"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-200">{currentUser.fullName || currentUser.username}</span>
            <span className="text-slate-400 font-mono text-[10px]">[{currentUser.role}]</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-300 animate-in fade-in slide-in-from-top-1">
              <div className="pb-2 mb-2 border-b border-slate-800">
                <div className="font-semibold text-white truncate">{currentUser.fullName || currentUser.username}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentUser.email || `${currentUser.username}@workstation.local`}</div>
                <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">User ID:</span>
                  <span className="text-blue-300 font-bold">{currentUser.userId || 'OFFICER-01'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono mt-0.5">
                  <span className="text-slate-400">Role:</span>
                  <span className="text-emerald-400 font-bold">{currentUser.role}</span>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Station</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
