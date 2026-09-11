import React from 'react';
import { 
  LayoutDashboard, 
  FolderSearch, 
  Video, 
  ScanFace, 
  ShieldCheck, 
  History, 
  Users, 
  Settings, 
  LogOut, 
  UserCheck,
  Shield,
  Film
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 
  | 'dashboard'
  | 'cases'
  | 'cctv_index'
  | 'new_search'
  | 'search_results'
  | 'clips'
  | 'evidence'
  | 'reports'
  | 'audit_logs'
  | 'users'
  | 'settings'
  | 'system_info';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: User;
  pendingReviewsCount: number;
  totalClipsCount: number;
  unindexedVideosCount: number;
  onSwitchUser?: () => void;
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
  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  // Map clips/evidence to consistent active state
  const isEvidenceActive = activeTab === 'evidence' || activeTab === 'clips';

  const primaryNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    isActive: boolean;
  }> = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      isActive: activeTab === 'dashboard'
    },
    { 
      id: 'cases', 
      label: 'Cases', 
      icon: FolderSearch,
      isActive: activeTab === 'cases'
    },
    { 
      id: 'cctv_index', 
      label: 'CCTV Indexing', 
      icon: Video,
      badge: unindexedVideosCount > 0 ? unindexedVideosCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      isActive: activeTab === 'cctv_index'
    },
    { 
      id: 'new_search', 
      label: 'Candidate Search', 
      icon: ScanFace,
      isActive: activeTab === 'new_search' || activeTab === 'search_results'
    },
    { 
      id: 'evidence', 
      label: 'Evidence', 
      icon: ShieldCheck,
      badge: totalClipsCount > 0 ? totalClipsCount : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      isActive: isEvidenceActive
    },
    { 
      id: 'audit_logs', 
      label: 'Audit Log', 
      icon: History,
      isActive: activeTab === 'audit_logs'
    },
  ];

  return (
    <aside 
      id="main-sidebar" 
      className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none text-slate-300 z-10"
    >
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm shrink-0">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 tracking-wider uppercase font-mono truncate">
                CCTV Forensic Station
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                Innovatiview Operations
              </p>
            </div>
          </div>
        </div>

        {/* Primary Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 py-1.5 font-mono">
            Forensic Workspace
          </div>
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    isActive ? 'bg-blue-500/30 text-blue-200 border-blue-400/40' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Administration Section */}
          <div className="pt-4 pb-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 py-1.5 font-mono">
              Administration
            </div>
          </div>

          {isAdmin && (
            <button
              id="nav-item-users"
              onClick={() => onTabChange('users')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Users className={`w-4 h-4 shrink-0 ${activeTab === 'users' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">User Management</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                Admin
              </span>
            </button>
          )}

          <button
            id="nav-item-settings"
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'settings' || activeTab === 'system_info'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Settings className={`w-4 h-4 shrink-0 ${(activeTab === 'settings' || activeTab === 'system_info') ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="truncate">Settings</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Footer Info: Current User, Role, Status, Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 space-y-2.5">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0 font-mono">
              {currentUser.fullName 
                ? currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : (currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {currentUser.fullName || currentUser.username || 'Authorized Officer'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentUser.role || 'Auditor'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-[10px] text-emerald-400 font-mono">
                  {currentUser.status === 'APPROVED' || currentUser.status === 'Active' ? 'Active' : currentUser.status}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            {onSwitchUser && (
              <button
                id="btn-switch-user"
                onClick={onSwitchUser}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Switch User Role"
              >
                <UserCheck className="w-3 h-3" />
                <span>Switch Role</span>
              </button>
            )}

            {onLogout && (
              <button
                id="btn-sidebar-logout"
                onClick={onLogout}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                title="Log Out of Forensic Station"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        <div className="px-2 py-0.5 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>Station v1.2</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Air-Gapped Ready
          </span>
        </div>
      </div>
    </aside>
  );
};
