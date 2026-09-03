import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  FolderKanban, 
  DatabaseZap, 
  ScanFace, 
  Film, 
  FileSpreadsheet, 
  Cpu, 
  Settings, 
  FileText, 
  Users, 
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  LogOut,
  UserCheck
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 
  | 'dashboard'
  | 'new_search'
  | 'cases'
  | 'cctv_index'
  | 'search_results'
  | 'clips'
  | 'reports'
  | 'system_info'
  | 'settings'
  | 'audit_logs'
  | 'users';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: User;
  pendingReviewsCount: number;
  totalClipsCount: number;
  unindexedVideosCount: number;
  onSwitchUser: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  pendingReviewsCount,
  totalClipsCount,
  unindexedVideosCount,
  onSwitchUser,
  onLogout,
}) => {
  const isAdmin = currentUser.role === 'Admin';

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    adminOnly?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new_search', label: 'New Candidate Search', icon: UserPlus },
    { id: 'cases', label: 'Case Management', icon: FolderKanban },
    { 
      id: 'cctv_index', 
      label: 'CCTV Vector Index', 
      icon: DatabaseZap,
      badge: unindexedVideosCount > 0 ? unindexedVideosCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { 
      id: 'search_results', 
      label: 'Search Results & Review', 
      icon: ScanFace,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    { 
      id: 'clips', 
      label: 'Clips & Evidence', 
      icon: Film,
      badge: totalClipsCount > 0 ? totalClipsCount : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { 
      id: 'users', 
      label: 'User Management', 
      icon: Users,
      badge: isAdmin ? 'Admin' : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      adminOnly: true
    },
    { id: 'system_info', label: 'System Hardware', icon: Cpu },
    { id: 'audit_logs', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      id="main-sidebar" 
      className="w-64 bg-[#1e293b]/50 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between shrink-0 select-none text-slate-300 z-10"
    >
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <ScanFace className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-100 tracking-tight">CCTV Search Engine</h1>
              <p className="text-[11px] text-slate-400 font-mono">Exam Forensic Station v1.0</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-2.5 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 py-1">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] backdrop-blur-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                    isActive ? 'bg-blue-500/30 text-blue-300 border-blue-400/40' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Current User */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02] space-y-2">
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
              {currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="truncate">
              <div className="text-[11px] font-semibold text-slate-200 truncate">{currentUser.fullName || currentUser.username}</div>
              <div className="text-[10px] text-blue-300 font-mono truncate">{currentUser.userId ? `${currentUser.userId} • ${currentUser.role}` : `${currentUser.role} Role`}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="btn-switch-user"
              onClick={onSwitchUser}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
              title="Switch User / Role"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
            {onLogout && (
              <button
                id="btn-sidebar-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Sign Out / Lock Station"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-2 py-1 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>AI: SFace + YuNet</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONNX Ready
          </span>
        </div>
      </div>
    </aside>
  );
};

