import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { User, UserRole, UserStatus } from '../types';

export type ForensicAction = 
  | 'SEARCH_EXECUTE'
  | 'MATCH_REVIEW'
  | 'CLIP_GENERATE'
  | 'VECTOR_INDEX'
  | 'DELETE_INDEX'
  | 'CASE_DELETE'
  | 'CASE_CREATE'
  | 'SETTINGS_MODIFY'
  | 'USER_MANAGE'
  | 'REPORT_EXPORT';

export const ROLE_PERMISSIONS: Record<string, ForensicAction[]> = {
  Admin: [
    'SEARCH_EXECUTE',
    'MATCH_REVIEW',
    'CLIP_GENERATE',
    'VECTOR_INDEX',
    'DELETE_INDEX',
    'CASE_DELETE',
    'CASE_CREATE',
    'SETTINGS_MODIFY',
    'USER_MANAGE',
    'REPORT_EXPORT',
  ],
  ADMIN: [
    'SEARCH_EXECUTE',
    'MATCH_REVIEW',
    'CLIP_GENERATE',
    'VECTOR_INDEX',
    'DELETE_INDEX',
    'CASE_DELETE',
    'CASE_CREATE',
    'SETTINGS_MODIFY',
    'USER_MANAGE',
    'REPORT_EXPORT',
  ],
  SUPER_ADMIN: [
    'SEARCH_EXECUTE',
    'MATCH_REVIEW',
    'CLIP_GENERATE',
    'VECTOR_INDEX',
    'DELETE_INDEX',
    'CASE_DELETE',
    'CASE_CREATE',
    'SETTINGS_MODIFY',
    'USER_MANAGE',
    'REPORT_EXPORT',
  ],
  Auditor: [
    'SEARCH_EXECUTE',
    'MATCH_REVIEW',
    'CLIP_GENERATE',
    'VECTOR_INDEX',
    'CASE_CREATE',
    'REPORT_EXPORT',
  ],
  Viewer: [
    'REPORT_EXPORT',
  ],
  USER: [],
};

export const hasRolePermission = (role: UserRole | string | undefined, action: ForensicAction): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
};

export interface UserProfileRow {
  id: string;
  full_name: string;
  email: string;
  mobile?: string | null;
  role: UserRole;
  status: UserStatus;
  user_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  last_login_at?: string | null;
  avatar?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  authLoading: boolean;
  authError: string | null;
  role: UserRole;
  status: UserStatus;
  isAuthenticated: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isAuditor: boolean;
  isViewer: boolean;
  isSupabaseReady: boolean;

  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string, mobile?: string, role?: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
  refreshCurrentUser: () => Promise<void>;

  // Role & Permission Utilities
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canPerform: (action: ForensicAction) => boolean;
  validatePermission: (
    action: ForensicAction, 
    onUnauthorized?: (reason: string) => void
  ) => boolean;

  // Admin User Approval & Management
  allUsers: User[];
  isLoadingUsers: boolean;
  refreshUsersList: () => Promise<void>;
  approveUser: (userId: string, assignedRole?: UserRole, customUserId?: string) => Promise<string>;
  rejectUser: (userId: string, reason?: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  toggleUserStatus: (userId: string, newStatus: 'Active' | 'Disabled') => Promise<void>;
  provisionUser: (user: { name: string; email: string; role: UserRole; mobile?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate human-readable forensic User ID: e.g. CVS-US-738201
export function generateForensicUserId(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `CVS-US-${digits}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin User Management state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Guard against concurrent registration/sync race conditions
  const isSyncingRef = useRef<boolean>(false);
  const isRegisteringRef = useRef<boolean>(false);

  const formatSupabaseError = (error: unknown): string => {
    if (!error) return 'An unknown authentication error occurred.';
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    if (lower.includes('invalid login credentials')) {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (lower.includes('user already registered') || lower.includes('email already in use')) {
      return 'This email address is already registered. Please sign in instead.';
    }
    if (lower.includes('password should be at least') || lower.includes('weak password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Email confirmation is pending. Please verify your inbox or contact administrator.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Too many requests. Please wait a few moments before trying again.';
    }
    if (lower.includes('invalid email')) {
      return 'Please enter a valid email address format.';
    }
    if (lower.includes('fetch') || lower.includes('network')) {
      return 'Unable to connect to Supabase servers. Please check your internet connection.';
    }
    return message;
  };

  // Convert raw database row into application User model
  const mapRowToUser = (row: UserProfileRow, fallbackEmail?: string | null): User => {
    // Normalize role: Admin, Auditor, Viewer, USER
    let role: UserRole = 'USER';
    if (row.role === 'Admin' || row.role === 'ADMIN' || row.role === 'SUPER_ADMIN') {
      role = 'Admin';
    } else if (row.role === 'Auditor') {
      role = 'Auditor';
    } else if (row.role === 'Viewer') {
      role = 'Viewer';
    }

    // Normalize status: strictly require APPROVED or Active in database row to be approved
    let status: UserStatus = 'PENDING';
    if (row.status === 'APPROVED' || row.status === 'Active') {
      status = 'APPROVED';
    } else if (row.status === 'REJECTED') {
      status = 'REJECTED';
    } else if (row.status === 'Disabled') {
      status = 'Disabled';
    }

    const name = row.full_name || (row.email ? row.email.split('@')[0] : 'Forensic Officer');
    const email = row.email || fallbackEmail || '';

    return {
      id: row.id,
      username: email ? email.split('@')[0] : 'officer',
      fullName: name,
      email,
      mobileNumber: row.mobile || '',
      role,
      status,
      userId: row.user_id || undefined,
      avatar: row.avatar || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      lastLogin: row.last_login_at || new Date().toISOString(),
      isSupabaseUser: true,
    };
  };

  // Synchronize PostgreSQL public.profiles row for authenticated user
  const syncUserProfile = useCallback(async (sbUser: SupabaseUser): Promise<User> => {
    if (!isSupabaseConfigured) {
      const nowIso = new Date().toISOString();
      return {
        id: sbUser.id,
        username: (sbUser.email || 'officer').split('@')[0],
        fullName: sbUser.user_metadata?.full_name || 'Forensic Officer',
        email: sbUser.email || '',
        role: 'USER',
        status: 'PENDING',
        createdAt: nowIso,
        lastLogin: nowIso,
        isSupabaseUser: true,
      };
    }

    const nowIso = new Date().toISOString();

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching Supabase profile:', error.message);
      }

      if (profile) {
        // Update last login timestamp quietly
        try {
          await supabase
            .from('profiles')
            .update({ last_login_at: nowIso })
            .eq('id', sbUser.id);
        } catch {
          // non-fatal
        }
        return mapRowToUser(profile as UserProfileRow, sbUser.email);
      } else {
        // Profile does not exist yet. Create default PENDING profile with USER role and NULL user_id.
        const fullName = sbUser.user_metadata?.full_name || 
          sbUser.user_metadata?.name || 
          (sbUser.email ? sbUser.email.split('@')[0] : 'Forensic Officer');
        const mobile = sbUser.user_metadata?.mobile || '';

        const newProfile: UserProfileRow = {
          id: sbUser.id,
          full_name: fullName,
          email: sbUser.email || '',
          mobile,
          role: 'USER',
          status: 'PENDING',
          user_id: null,
          created_at: nowIso,
          updated_at: nowIso,
          approved_at: null,
          approved_by: null,
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
          last_login_at: nowIso,
          avatar: sbUser.user_metadata?.avatar_url || '',
        };

        const { error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (insertErr) {
          console.warn('Could not insert initial Supabase profile:', insertErr.message);
        }

        return mapRowToUser(newProfile, sbUser.email);
      }
    } catch (err) {
      console.warn('Exception during profile synchronization, falling back to safe PENDING profile:', err);
      return {
        id: sbUser.id,
        username: (sbUser.email || 'officer').split('@')[0],
        fullName: sbUser.user_metadata?.full_name || 'Forensic Officer',
        email: sbUser.email || '',
        role: 'USER',
        status: 'PENDING',
        userId: undefined,
        createdAt: nowIso,
        lastLogin: nowIso,
        isSupabaseUser: true,
      };
    }
  }, []);

  // Listen to Supabase Auth state changes and session restoration
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Check existing active session on mount
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn('Failed to retrieve initial Supabase session:', error.message);
      }
      if (session?.user) {
        setSupabaseUser(session.user);
        try {
          const appUser = await syncUserProfile(session.user);
          if (mounted) setCurrentUser(appUser);
        } catch (syncErr) {
          console.error('Error syncing initial profile:', syncErr);
        }
      }
      if (mounted) setIsLoading(false);
    });

    // Subscribe to auth state updates (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (isRegisteringRef.current) return;
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        if (session?.user) {
          setSupabaseUser(session.user);
          const appUser = await syncUserProfile(session.user);
          if (mounted) setCurrentUser(appUser);
        } else {
          if (mounted) {
            setSupabaseUser(null);
            setCurrentUser(null);
          }
        }
      } catch (err: unknown) {
        console.error('Authentication Error in onAuthStateChange:', err);
        if (mounted) {
          setAuthError(err instanceof Error ? err.message : 'Authentication verification error.');
          setCurrentUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
        isSyncingRef.current = false;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserProfile]);

  // Refresh current user profile from Supabase
  const refreshCurrentUser = async () => {
    if (!supabaseUser) return;
    try {
      const updated = await syncUserProfile(supabaseUser);
      setCurrentUser(updated);
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings.'
      );
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Authentication failed: No user returned.');

      const appUser = await syncUserProfile(data.user);
      setSupabaseUser(data.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatSupabaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up / Register with Email & Password (ADMIN APPROVAL WORKFLOW)
  const signUpWithEmail = async (
    name: string, 
    email: string, 
    pass: string, 
    mobile?: string,
    _requestedRole: UserRole = 'Auditor'
  ) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings.'
      );
    }

    setIsLoading(true);
    setAuthError(null);
    isRegisteringRef.current = true;

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim() || trimmedEmail.split('@')[0];
      const trimmedMobile = mobile?.trim() || '';

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: pass,
        options: {
          data: {
            full_name: trimmedName,
            name: trimmedName,
            mobile: trimmedMobile,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Registration failed: No user returned.');

      const nowIso = new Date().toISOString();

      // Ensure profile row exists in public.profiles with PENDING status, USER role, and NULL user_id
      const newProfile: UserProfileRow = {
        id: data.user.id,
        full_name: trimmedName,
        email: trimmedEmail,
        mobile: trimmedMobile,
        role: 'USER',     // Strict initial role
        status: 'PENDING', // Strict initial status
        user_id: null,    // No activated forensic ID
        created_at: nowIso,
        updated_at: nowIso,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        last_login_at: nowIso,
        avatar: '',
      };

      const { error: insertErr } = await supabase
        .from('profiles')
        .insert(newProfile);

      if (insertErr && !insertErr.message.includes('duplicate key') && !insertErr.message.includes('already exists')) {
        console.warn('Profile insertion note:', insertErr.message);
      }

      // Keep user signed in as PENDING - directly routed to PendingApprovalView
      const appUser = mapRowToUser(newProfile, data.user.email);
      setSupabaseUser(data.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatSupabaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      isRegisteringRef.current = false;
      setIsLoading(false);
    }
  };

  // Sign In with Google Federated Identity
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings.'
      );
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err) {
      const msg = formatSupabaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset with Email Enumeration Protection
  const resetPassword = async (email: string): Promise<string> => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error('Please enter a valid email address.');
    }

    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings.'
      );
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.warn('Supabase password reset response:', error.message);
      }

      // Security requirement: Generic message protects against email enumeration
      return 'If an account exists for this email address, password reset instructions have been sent.';
    } catch (err) {
      console.warn('Reset password error:', err);
      // Even on caught error, return standard privacy-preserving response unless network broke
      return 'If an account exists for this email address, password reset instructions have been sent.';
    }
  };

  // Sign Out
  const signOutUser = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setCurrentUser(null);
    setSupabaseUser(null);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Fetch list of users for Admin User Management View
  const refreshUsersList = async () => {
    const isCallerAdmin = currentUser?.status === 'APPROVED' && 
      (currentUser?.role === 'Admin' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN');
    
    if (!isCallerAdmin || !isSupabaseConfigured) {
      setAllUsers([]);
      return;
    }

    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      const list: User[] = (data || []).map(row => mapRowToUser(row as UserProfileRow));

      // Sort with PENDING users first, then newest registrations
      list.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      setAllUsers(list);
    } catch (err) {
      console.warn('Could not fetch Supabase profiles:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Admin Action: Approve a pending registration
  const approveUser = async (
    userId: string, 
    assignedRole: UserRole = 'Auditor',
    customUserId?: string
  ): Promise<string> => {
    const adminUid = supabaseUser?.id;
    if (!adminUid) {
      throw new Error('Administrative authorization required: No authenticated administrator UUID.');
    }
    if (!currentUser || currentUser.status !== 'APPROVED' || (currentUser.role !== 'Admin' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      throw new Error('Administrative authorization required: Only verified administrators can approve users.');
    }

    const target = allUsers.find(u => u.id === userId);
    const newUserId = customUserId?.trim() || target?.userId || generateForensicUserId();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'APPROVED',
        role: assignedRole,
        approved_at: nowIso,
        approved_by: adminUid,
        user_id: newUserId,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to approve user: ${error.message}`);
    }

    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'APPROVED',
          role: assignedRole,
          userId: newUserId,
          approvedAt: nowIso,
          approvedBy: adminUid,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        };
      }
      return u;
    }));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? {
        ...prev,
        status: 'APPROVED',
        role: assignedRole,
        userId: newUserId,
      } : null);
    }

    return newUserId;
  };

  // Admin Action: Reject a registration request
  const rejectUser = async (userId: string, reason?: string) => {
    const adminUid = supabaseUser?.id;
    if (!adminUid) {
      throw new Error('Administrative authorization required: No authenticated administrator UUID.');
    }
    if (!currentUser || currentUser.status !== 'APPROVED' || (currentUser.role !== 'Admin' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      throw new Error('Administrative authorization required: Only verified administrators can reject users.');
    }

    const nowIso = new Date().toISOString();
    const finalReason = reason?.trim() || 'Registration request not approved by forensic administrator.';

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'REJECTED',
        rejected_at: nowIso,
        rejected_by: adminUid,
        rejection_reason: finalReason,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to reject user: ${error.message}`);
    }

    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'REJECTED',
          rejectedAt: nowIso,
          rejectedBy: adminUid,
          rejectionReason: finalReason,
        };
      }
      return u;
    }));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? {
        ...prev,
        status: 'REJECTED',
        rejectedAt: nowIso,
        rejectedBy: adminUid,
        rejectionReason: finalReason,
      } : null);
    }
  };

  // Admin Action: Update User Role
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const adminUid = supabaseUser?.id;
    if (!adminUid) {
      throw new Error('Administrative authorization required: No authenticated administrator UUID.');
    }
    if (!currentUser || currentUser.status !== 'APPROVED' || (currentUser.role !== 'Admin' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      throw new Error('Administrative authorization required: Only verified administrators can modify user roles.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  // Admin Action: Toggle Active / Disabled
  const toggleUserStatus = async (userId: string, newStatus: 'Active' | 'Disabled') => {
    const adminUid = supabaseUser?.id;
    if (!adminUid) {
      throw new Error('Administrative authorization required: No authenticated administrator UUID.');
    }
    if (!currentUser || currentUser.status !== 'APPROVED' || (currentUser.role !== 'Admin' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      throw new Error('Administrative authorization required: Only verified administrators can modify account status.');
    }

    const statusVal: UserStatus = newStatus === 'Active' ? 'APPROVED' : 'Disabled';
    const { error } = await supabase
      .from('profiles')
      .update({ status: statusVal })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to toggle account status: ${error.message}`);
    }

    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: statusVal } : u));
  };

  // Admin Action: Manually provision pre-approved user
  const provisionUser = async (user: { name: string; email: string; role: UserRole; mobile?: string }) => {
    const adminUid = supabaseUser?.id;
    if (!adminUid) {
      throw new Error('Administrative authorization required: No authenticated administrator UUID.');
    }
    if (!currentUser || currentUser.status !== 'APPROVED' || (currentUser.role !== 'Admin' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      throw new Error('Administrative authorization required: Only verified administrators can provision users.');
    }

    const newId = `usr-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const newUserId = generateForensicUserId();

    const newProfile: UserProfileRow = {
      id: newId,
      full_name: user.name,
      email: user.email,
      mobile: user.mobile || '',
      role: user.role,
      status: 'APPROVED',
      user_id: newUserId,
      created_at: nowIso,
      updated_at: nowIso,
      approved_at: nowIso,
      approved_by: adminUid,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      last_login_at: null,
      avatar: '',
    };

    const { error } = await supabase
      .from('profiles')
      .insert(newProfile);

    if (error) {
      throw new Error(`Failed to provision user: ${error.message}`);
    }

    const newUserObj = mapRowToUser(newProfile);
    setAllUsers(prev => [newUserObj, ...prev]);
  };

  // Status & Role calculations
  const role: UserRole = currentUser?.role || 'USER';
  const status: UserStatus = currentUser?.status || 'PENDING';
  const isAuthenticated = !!currentUser && !!supabaseUser;
  const isApproved = status === 'APPROVED' || status === 'Active';
  const isAdmin = isApproved && (role === 'Admin' || role === 'ADMIN' || role === 'SUPER_ADMIN');
  const isAuditor = isApproved && (role === 'Auditor');
  const isViewer = isApproved && (role === 'Viewer');

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!currentUser || !currentUser.role || !isApproved) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(currentUser.role);
  };

  const canPerform = (action: ForensicAction): boolean => {
    if (!currentUser || !currentUser.role || !isApproved) return false;
    return hasRolePermission(currentUser.role, action);
  };

  const validatePermission = (
    action: ForensicAction, 
    onUnauthorized?: (reason: string) => void
  ): boolean => {
    if (!currentUser || !isApproved) {
      const reason = 'Authorized and approved officer status required to execute this forensic action.';
      if (onUnauthorized) onUnauthorized(reason);
      return false;
    }
    const permitted = hasRolePermission(currentUser.role, action);
    if (!permitted) {
      const reason = `Access Denied: Your assigned role (${currentUser.role}) does not have permission to execute '${action}'. Contact a System Administrator.`;
      if (onUnauthorized) onUnauthorized(reason);
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        supabaseUser,
        isLoading,
        authLoading: isLoading,
        authError,
        role,
        status,
        isAuthenticated,
        isApproved,
        isAdmin,
        isAuditor,
        isViewer,
        isSupabaseReady: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        signOutUser,
        clearAuthError,
        refreshCurrentUser,
        hasRole,
        canPerform,
        validatePermission,
        allUsers,
        isLoadingUsers,
        refreshUsersList,
        approveUser,
        rejectUser,
        updateUserRole,
        toggleUserStatus,
        provisionUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
