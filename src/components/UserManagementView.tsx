import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Lock, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  KeyRound, 
  AlertTriangle,
  Info,
  Edit2,
  Trash2,
  UserX,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const UserManagementView: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    isLoadingUsers, 
    refreshUsersList, 
    updateUserRole, 
    toggleUserStatus, 
    provisionUser 
  } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Auditor');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    refreshUsersList();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    await provisionUser({
      name: newUserName.trim() || newUserEmail.split('@')[0],
      email: newUserEmail.trim(),
      role: newUserRole,
    });

    setActionSuccess(`Provisioned profile for ${newUserEmail} as ${newUserRole}.`);
    setShowAddModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Auditor');

    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    await updateUserRole(userId, role);
    setActionSuccess(`Updated role to ${role}.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleToggleStatus = async (userId: string, currentStatus?: 'Active' | 'Disabled') => {
    const nextStatus = currentStatus === 'Disabled' ? 'Active' : 'Disabled';
    await toggleUserStatus(userId, nextStatus);
    setActionSuccess(`Account status set to ${nextStatus}.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const isAdmin = currentUser?.role === 'Admin';

  if (!isAdmin) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied (Admin Required)</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Your current account role is <span className="font-semibold text-amber-400">{currentUser?.role}</span>.
          User Management and Security Provisioning is restricted to accounts with <span className="font-semibold text-blue-400">ADMIN</span> privileges.
        </p>
      </div>
    );
  }

  return (
    <div id="user-management-view" className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Forensic User & Access Management
              </h1>
              <p className="text-xs text-slate-400">
                Manage workstation officer accounts, role-based capabilities, and Firebase security bindings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshUsersList()}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New Officer</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Role Capabilities Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ADMIN */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-500/30 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ADMIN
            </span>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-2">Full Forensic Authority</p>
          <ul className="text-[11px] text-slate-400 space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              Manage officer accounts & role bindings
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              Manage storage directories & AI thresholds
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              Full search, review, clip extraction & case deletion
            </li>
          </ul>
        </div>

        {/* AUDITOR */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-500/30 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AUDITOR
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-2">Forensic Search & Evidence</p>
          <ul className="text-[11px] text-slate-400 space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              Create search cases & upload CCTV
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              Execute YuNet + SFace biometric queries
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              Confirm/reject matches & export signed clips
            </li>
          </ul>
        </div>

        {/* VIEWER */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
              VIEWER
            </span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-2">Read-Only Observation</p>
          <ul className="text-[11px] text-slate-400 space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              Inspect verified cases and reports
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              View confirmed CCTV appearance events
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              Strictly prohibited from modifying evidence
            </li>
          </ul>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Active Forensic Accounts ({allUsers.length})
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Zero Password Storage in Firestore (Managed by Firebase Auth)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-white/10">
              <tr>
                <th className="px-4 py-3">Officer Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Forensic Role</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allUsers.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const isCurrentDisabled = u.status === 'Disabled';
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-xs">
                          {u.fullName ? u.fullName.substring(0, 2).toUpperCase() : 'OF'}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">ID: {u.id.substring(0, 12)}...</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{u.email || `${u.username}@workstation.local`}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={isSelf}
                        className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-60"
                      >
                        <option value="Admin">ADMIN</option>
                        <option value="Auditor">AUDITOR</option>
                        <option value="Viewer">VIEWER</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                          isCurrentDisabled
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrentDisabled ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                          }`}
                        />
                        {u.status || 'Active'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {u.lastLogin || 'N/A'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isCurrentDisabled
                              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                              : 'bg-rose-600/20 text-rose-300 border-rose-500/30 hover:bg-rose-600/30'
                          }`}
                        >
                          {isCurrentDisabled ? 'Enable User' : 'Disable User'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Officer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Provision New Officer</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Officer Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="r.kumar@examination-agency.gov.in"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Auditor">AUDITOR (Search, Verify Matches, Extract Clips)</option>
                  <option value="Admin">ADMIN (Full Access & User Management)</option>
                  <option value="Viewer">VIEWER (Read-Only Logs & Evidence)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The officer will be able to log in using this email address or sign in with Google. Passwords are created upon their first sign-in or via password reset.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Save & Provision Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
