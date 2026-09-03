import React, { useState } from 'react';
import { 
  Shield, 
  Cpu, 
  HardDrive, 
  Minus, 
  Square, 
  X, 
  FolderKanban, 
  Lock, 
  Sparkles,
  WifiOff,
  LogOut,
  ChevronDown,
  UserCheck
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

  return (
    <header 
      id="windows-title-bar" 
      className="h-10 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-3 select-none z-50 text-xs text-slate-300 shrink-0"
    >
      {/* Left: App icon, Title, Security status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold tracking-wide backdrop-blur-xs">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px] font-bold">CCTV-FORENSIC-WORKSTATION</span>
        </div>

        <div className="h-3.5 w-px bg-white/10" />

        {/* Offline Badge */}
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-xs">
          <WifiOff className="w-3 h-3" />
          <span>Local / Air-Gapped Offline</span>
        </span>

        {/* Quick Demo Button */}
        <button
          id="btn-quick-demo-titlebar"
          onClick={onOpenQuickDemo}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all backdrop-blur-xs cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.15)]"
          title="Load pre-configured examination exam hall candidate scenario"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="font-medium">1-Click Live Test Case</span>
        </button>
      </div>

      {/* Center: Active Case Quick Switcher */}
      <div className="flex items-center gap-2">
        <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-400">Active Case:</span>
        <select
          id="select-active-case-titlebar"
          value={currentCase?.id || ''}
          onChange={(e) => onSelectCase(e.target.value)}
          className="bg-slate-900/80 border border-white/10 text-slate-200 text-xs rounded-md px-2.5 py-0.5 font-mono focus:outline-none focus:border-blue-500 max-w-[260px] truncate backdrop-blur-sm"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
              {c.caseCode} - {c.candidate?.candidateName || 'Candidate'} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Right: Hardware Telemetry, User Badge, Window Controls */}
      <div className="flex items-center gap-3">
        {/* GPU / CPU Indicator */}
        <button
          id="btn-telemetry-badge"
          onClick={onOpenSystemInfo}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors backdrop-blur-xs cursor-pointer"
          title="Click to view full System Telemetry & Benchmark"
        >
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span className="font-mono text-[11px]">GPU: RTX 4090 ({systemHardware.gpuUsagePercent}%)</span>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-[11px]">RAM: {systemHardware.ramUsedGb.toFixed(0)}/{systemHardware.ramTotalGb}GB</span>
        </button>

        {/* User Pill with Dropdown */}
        <div className="relative">
          <button
            id="btn-titlebar-user-pill"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <Lock className="w-2.5 h-2.5 text-blue-400" />
            <span className="font-semibold text-slate-200">{currentUser.fullName || currentUser.username}</span>
            <span className="text-blue-300 font-mono text-[10px]">[{currentUser.userId || currentUser.role}]</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl p-2.5 z-50 text-xs text-slate-300 animate-in fade-in slide-in-from-top-1">
              <div className="px-2 py-1.5 border-b border-white/10 mb-1.5">
                <div className="font-semibold text-white truncate">{currentUser.fullName || currentUser.username}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentUser.email || `${currentUser.username}@workstation.local`}</div>
                <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1 border-t border-white/5">
                  <span className="text-slate-400">User ID:</span>
                  <span className="text-blue-300 font-bold">{currentUser.userId || 'ACTIVE-OFFICER'}</span>
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
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-300 hover:bg-rose-500/20 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lock & Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mock Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center">
          <button 
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button 
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button 
            onClick={onLogout}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-rose-500/80 hover:text-white transition-colors cursor-pointer"
            title="Exit / Sign Out"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
