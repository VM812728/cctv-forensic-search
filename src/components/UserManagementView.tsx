import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  Clock,
  Check,
  X,
  Phone,
  Search,
  Filter,
  BadgeCheck,
  Ban,
  Calendar,
  ShieldQuestion
} from 'lucide-react';
import { useAuth, generateForensicUserId } from '../context/AuthContext';
import { User, UserRole, UserStatus } from '../types';

export const UserManagementView: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    isLoadingUsers, 
    refreshUsersList, 
    approveUser,
    rejectUser,
    updateUserRole, 
    toggleUserStatus, 
    provisionUser 
  } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<User | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<User | null>(null);

  // Form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Auditor');

  // Approval modal state
  const [approvalRole, setApprovalRole] = useState<UserRole>('Auditor');
  const [assignedUserId, setAssignedUserId] = useState<string>('');

  // Rejection modal state
  const [rejectionReason, setRejectionReason] = useState('');

  // Feedback notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Guard: Strictly require verified APPROVED status + Admin role
  const isAdmin = currentUser?.status === 'APPROVED' && 
    (currentUser?.role === 'Admin' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN');

  useEffect(() => {
    if (isAdmin) {
      refreshUsersList();
    }
  }, [isAdmin]);

  // Filtered lists
  const pendingUsers = useMemo(() => {
    return allUsers.filter(u => u.status === 'PENDING');
  }, [allUsers]);

  const approvedUsers = useMemo(() => {
    return allUsers.filter(u => u.status === 'APPROVED' || u.status === 'Active');
  }, [allUsers]);

  const displayedUsers = useMemo(() => {
    let list = allUsers;
    if (activeTab === 'pending') {
      list = pendingUsers;
    } else if (activeTab === 'active') {
      list = approvedUsers;
    }

    if (statusFilter !== 'ALL' && activeTab === 'all') {
      list = list.filter(u => u.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.userId && u.userId.toLowerCase().includes(q)) ||
        (u.mobileNumber && u.mobileNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allUsers, activeTab, pendingUsers, approvedUsers, statusFilter, searchQuery]);

  // Open Approval Modal
  const handleOpenApproveModal = (user: User) => {
    setShowApproveModal(user);
    setApprovalRole(user.role === 'USER' ? 'Auditor' : user.role);
    setAssignedUserId(user.userId || generateForensicUserId());
    setActionError(null);
  };

  // Confirm Approval
  const handleConfirmApproval = async () => {
    if (!showApproveModal) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const uid = await approveUser(showApproveModal.id, approvalRole, assignedUserId);
      setActionSuccess(`Officer ${showApproveModal.fullName} approved. User ID ${uid} issued.`);
      setShowApproveModal(null);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Rejection Modal
  const handleOpenRejectModal = (user: User) => {
    setShowRejectModal(user);
    setRejectionReason('');
    setActionError(null);
  };

  // Confirm Rejection
  const handleConfirmRejection = async () => {
    if (!showRejectModal) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await rejectUser(showRejectModal.id, rejectionReason || 'Registration not approved by forensic administrator.');
      setActionSuccess(`Registration request for ${showRejectModal.fullName} has been rejected.`);
      setShowRejectModal(null);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create Pre-Approved User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    setIsProcessing(true);
    try {
      await provisionUser({
        name: newUserName.trim() || newUserEmail.split('@')[0],
        email: newUserEmail.trim(),
        mobile: newUserMobile.trim(),
        role: newUserRole,
      });

      setActionSuccess(`Pre-approved profile created for ${newUserEmail} as ${newUserRole}.`);
      setShowAddModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserMobile('');
      setNewUserRole('Auditor');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'User provisioning failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, role);
      setActionSuccess(`Updated role to ${role}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionError('Failed to update role.');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus?: UserStatus) => {
    const nextStatus = currentStatus === 'Disabled' ? 'Active' : 'Disabled';
    try {
      await toggleUserStatus(userId, nextStatus);
      setActionSuccess(`Account status updated to ${nextStatus}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionError('Failed to toggle status.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied (Admin Required)</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Your current account role is <span className="font-semibold text-amber-400">{currentUser?.role}</span>.
          User Approval and Security Management is restricted to verified Administrator accounts.
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
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>User Management & Admin Approval System</span>
                {pendingUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold animate-pulse">
                    {pendingUsers.length} Pending
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                Review officer registration requests, issue User IDs, and manage role-based security credentials
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
            <span>Pre-Provision Officer</span>
          </button>
        </div>
      </div>

      {/* Action Notification Messages */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tab Selectors & Summary Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Pending Approvals</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'pending' ? 'bg-amber-800 text-white' : 'bg-white/10 text-slate-300'
            }`}>
              {pendingUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BadgeCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>Approved Officers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'active' ? 'bg-blue-800 text-white' : 'bg-white/10 text-slate-300'
            }`}>
              {approvedUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>All Registrations</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-white/10 text-slate-300'
            }`}>
              {allUsers.length}
            </span>
          </button>
        </div>

        {/* Search Bar & Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, ID..."
              className="bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
            />
          </div>

          {activeTab === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="Disabled">Disabled</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content View Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
            {activeTab === 'pending' ? (
              <>
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Pending Officer Approval Requests ({displayedUsers.length})</span>
              </>
            ) : activeTab === 'active' ? (
              <>
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <span>Approved Workstation Officers ({displayedUsers.length})</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-blue-400" />
                <span>All Registered Accounts ({displayedUsers.length})</span>
              </>
            )}
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Strict Admin Role Gating Active</span>
          </div>
        </div>

        {displayedUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No user records found</p>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'pending'
                ? 'There are currently no pending registration requests awaiting review.'
                : 'No accounts matched your current search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Officer Details</th>
                  <th className="px-4 py-3">Official Email</th>
                  <th className="px-4 py-3">Assigned User ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Approval Status</th>
                  <th className="px-4 py-3">Registered Date</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {displayedUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const isPending = u.status === 'PENDING';
                  const isRejected = u.status === 'REJECTED';
                  const isApproved = u.status === 'APPROVED' || u.status === 'Active';
                  const isDisabled = u.status === 'Disabled';

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Officer Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPending 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : isRejected 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            {u.fullName ? u.fullName.substring(0, 2).toUpperCase() : 'OF'}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{u.fullName || u.username}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            {u.mobileNumber ? (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{u.mobileNumber}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 font-mono">No contact mobile</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* User ID */}
                      <td className="px-4 py-3.5 font-mono">
                        {u.userId ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold text-[11px]">
                            {u.userId}
                          </span>
                        ) : isPending ? (
                          <span className="text-[11px] text-amber-400 font-medium italic">
                            Pending Issue
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">None</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        {isApproved ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            disabled={isSelf}
                            className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-60 cursor-pointer"
                          >
                            <option value="Admin">ADMIN</option>
                            <option value="Auditor">AUDITOR</option>
                            <option value="Viewer">VIEWER</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-mono">
                            {u.role || 'USER'}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            PENDING
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            REJECTED
                          </span>
                        ) : isDisabled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-400 border border-white/10 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            DISABLED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            APPROVED
                          </span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                        {u.createdAt ? u.createdAt.substring(0, 10) : '2026-08-30'}
                      </td>

                      {/* Admin Actions */}
                      <td className="px-4 py-3.5 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenApproveModal(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>APPROVE</span>
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(u)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>REJECT</span>
                            </button>
                          </div>
                        ) : isRejected ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenApproveModal(u)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                              Re-Approve
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                  isDisabled
                                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                                    : 'bg-rose-600/15 text-rose-300 border-rose-500/30 hover:bg-rose-600/25'
                                }`}
                              >
                                {isDisabled ? 'Enable' : 'Deactivate'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Approve Officer Registration</h3>
                  <p className="text-[11px] text-slate-400">Grant workstation access & issue forensic credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowApproveModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Officer Summary Card */}
              <div className="bg-slate-950/60 border border-white/10 rounded-xl p-3.5 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Officer Name:</span>
                  <span className="text-white font-semibold">{showApproveModal.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Official Email:</span>
                  <span className="text-slate-200">{showApproveModal.email}</span>
                </div>
                {showApproveModal.mobileNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Contact Mobile:</span>
                    <span className="text-slate-200">{showApproveModal.mobileNumber}</span>
                  </div>
                )}
              </div>

              {/* Assign Role */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Assign Workstation Role *
                </label>
                <select
                  value={approvalRole}
                  onChange={(e) => setApprovalRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Auditor">AUDITOR (Full CCTV Search, Matches Review, Evidence Clips)</option>
                  <option value="Admin">ADMIN (Full Authority, User Approval, Settings & Storage)</option>
                  <option value="Viewer">VIEWER (Read-Only Case & Evidence Inspection)</option>
                </select>
              </div>

              {/* Assign User ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">
                    Assign Official Forensic User ID *
                  </label>
                  <button
                    type="button"
                    onClick={() => setAssignedUserId(generateForensicUserId())}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-mono cursor-pointer"
                  >
                    Generate New ID
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    placeholder="e.g. CVS-US-738201"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  This unique ID is permanently stamped onto evidence clips exported by this officer.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(null)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessing ? 'APPROVING...' : 'CONFIRM APPROVAL & ACTIVATE'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-400" />
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Reject Registration Request</h3>
                  <p className="text-[11px] text-slate-400">Prohibit access to the examination forensic workstation</p>
                </div>
              </div>
              <button
                onClick={() => setShowRejectModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/60 border border-white/10 rounded-xl p-3.5 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Officer Name:</span>
                  <span className="text-white font-semibold">{showRejectModal.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Official Email:</span>
                  <span className="text-slate-200">{showRejectModal.email}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Reason for Rejection (Visible to Officer)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Identity could not be verified against the official examiner roster for this jurisdiction."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(null)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isProcessing ? 'REJECTING...' : 'CONFIRM REJECTION'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Officer Modal (Pre-Provision) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Pre-Provision Approved Officer</h3>
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
                <label className="block font-semibold text-slate-300 mb-1">Full Officer Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Inspector Ramesh Kumar"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="r.kumar@examination-agency.gov.in"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Contact Mobile Number (Optional)</label>
                <input
                  type="tel"
                  value={newUserMobile}
                  onChange={(e) => setNewUserMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Auditor">AUDITOR (Search, Verify Matches, Extract Clips)</option>
                  <option value="Admin">ADMIN (Full Access & User Management)</option>
                  <option value="Viewer">VIEWER (Read-Only Logs & Evidence)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This account will be created directly in APPROVED status with a generated User ID. The officer can immediately sign in.
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
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  {isProcessing ? 'Provisioning...' : 'Provision & Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
