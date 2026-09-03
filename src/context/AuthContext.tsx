import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  FirebaseUser
} from '../services/firebase';
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

export interface UserProfileData {
  uid: string;
  name?: string;
  full_name?: string;
  email: string;
  mobile_number?: string;
  role: UserRole;
  status: UserStatus;
  user_id?: string | null;
  created_at?: string;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  lastLoginAt?: string;
  createdAt?: string;
  avatar?: string;
}

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
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
  approveUser: (userId: string, assignedRole?: UserRole) => Promise<string>;
  rejectUser: (userId: string, reason?: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  toggleUserStatus: (userId: string, newStatus: 'Active' | 'Disabled') => Promise<void>;
  provisionUser: (user: { name: string; email: string; role: UserRole; mobile?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Primary administrator email pre-authorized for the forensic workstation
export const BOOTSTRAP_ADMIN_EMAIL = 'vm812728@gmail.com';

// Generate human-readable forensic User ID: e.g. CVS-US-738201
export function generateForensicUserId(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `CVS-US-${digits}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin User Management state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Guard to prevent concurrent sync operations
  const isSyncingRef = useRef<boolean>(false);

  const formatFirebaseError = (error: unknown): string => {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return error instanceof Error ? error.message : 'An unknown authentication error occurred.';
    }
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'No registered account found with this email address.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your credentials.';
      case 'auth/user-disabled':
        return 'Your account has been disabled. Please contact the administrator.';
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by browser. Please allow popups for this site.';
      case 'auth/network-request-failed':
        return 'Unable to connect to authentication servers. Please verify internet connection.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Access to this account has been temporarily restricted. Please try again later or reset password.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Auth settings. Please register domain in Firebase Console.';
      default:
        return (error as { message?: string }).message || 'Authentication operation failed.';
    }
  };

  // Convert raw Firestore doc data into application User model
  const mapDocToUser = (uid: string, data: UserProfileData, fallbackEmail?: string | null): User => {
    const isBootstrap = (data.email || fallbackEmail || '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    
    // Normalize role: Admin, Auditor, Viewer, USER
    let role: UserRole = (data.role as UserRole) || (isBootstrap ? 'Admin' : 'USER');
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      role = 'Admin';
    }

    // Normalize status: APPROVED, PENDING, REJECTED, Active, Disabled
    let status: UserStatus = data.status || (isBootstrap ? 'APPROVED' : 'PENDING');
    if (isBootstrap) {
      status = 'APPROVED';
      role = 'Admin';
    }

    const name = data.full_name || data.name || (data.email ? data.email.split('@')[0] : 'Forensic Officer');
    const email = data.email || fallbackEmail || '';

    return {
      id: uid,
      username: email ? email.split('@')[0] : 'officer',
      fullName: name,
      email,
      mobileNumber: data.mobile_number || '',
      role,
      status,
      userId: data.user_id || (isBootstrap ? 'CVS-ADMIN-000001' : undefined),
      avatar: data.avatar || undefined,
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      approvedAt: data.approved_at || null,
      approvedBy: data.approved_by || null,
      rejectedAt: data.rejected_at || null,
      rejectedBy: data.rejected_by || null,
      rejectionReason: data.rejection_reason || null,
      lastLogin: data.lastLoginAt || new Date().toISOString(),
      isFirebaseUser: true,
    };
  };

  // Synchronize Firestore profile for authenticated user
  const syncUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, 'users', fbUser.uid);
    const nowIso = new Date().toISOString();
    const isBootstrap = fbUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    try {
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfileData;

        // If it's the bootstrap admin, guarantee active admin status in DB
        if (isBootstrap && (data.role !== 'Admin' || (data.status !== 'APPROVED' && data.status !== 'Active'))) {
          try {
            await updateDoc(userRef, {
              role: 'Admin',
              status: 'APPROVED',
              approved_at: nowIso,
              approved_by: 'SYSTEM_BOOTSTRAP',
              user_id: data.user_id || 'CVS-ADMIN-000001',
              lastLoginAt: nowIso,
            });
          } catch {
            // non-fatal
          }
        } else {
          // Update last login timestamp
          try {
            await updateDoc(userRef, { lastLoginAt: nowIso });
          } catch {
            // non-fatal
          }
        }

        return mapDocToUser(fbUser.uid, data, fbUser.email);
      } else {
        // Document does not exist yet in Firestore
        // Provision initial record according to approval mandate
        const initialRole: UserRole = isBootstrap ? 'Admin' : 'USER';
        const initialStatus: UserStatus = isBootstrap ? 'APPROVED' : 'PENDING';
        const initialUserId = isBootstrap ? 'CVS-ADMIN-000001' : null;

        const newProfile: UserProfileData = {
          uid: fbUser.uid,
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Forensic Officer'),
          full_name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Forensic Officer'),
          email: fbUser.email || '',
          mobile_number: '',
          role: initialRole,
          status: initialStatus,
          user_id: initialUserId,
          created_at: nowIso,
          approved_at: isBootstrap ? nowIso : null,
          approved_by: isBootstrap ? 'SYSTEM_BOOTSTRAP' : null,
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
          lastLoginAt: nowIso,
          avatar: fbUser.photoURL || '',
        };

        try {
          await setDoc(userRef, newProfile);
        } catch (setErr) {
          console.warn('Could not set initial profile in Firestore:', setErr);
        }

        return mapDocToUser(fbUser.uid, newProfile, fbUser.email);
      }
    } catch (err) {
      console.warn('Firestore profile query failed, using fallback profile:', err);
      // Fallback safe representation
      return {
        id: fbUser.uid,
        username: (fbUser.email || 'user').split('@')[0],
        fullName: fbUser.displayName || 'Forensic Officer',
        email: fbUser.email || '',
        role: isBootstrap ? 'Admin' : 'USER',
        status: isBootstrap ? 'APPROVED' : 'PENDING',
        userId: isBootstrap ? 'CVS-ADMIN-000001' : undefined,
        createdAt: nowIso,
        lastLogin: nowIso,
        isFirebaseUser: true,
      };
    }
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          const appUser = await syncUserProfile(fbUser);
          setCurrentUser(appUser);
        } else {
          setFirebaseUser(null);
          setCurrentUser(null);
        }
      } catch (err: unknown) {
        console.error('Authentication Error in onAuthStateChanged:', err);
        setAuthError(err instanceof Error ? err.message : 'Authentication verification error.');
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
        isSyncingRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [syncUserProfile]);

  // Refresh current user profile from Firestore (e.g. while pending approval)
  const refreshCurrentUser = async () => {
    if (!auth.currentUser) return;
    try {
      const updatedUser = await syncUserProfile(auth.currentUser);
      setCurrentUser(updatedUser);
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const appUser = await syncUserProfile(cred.user);
      setFirebaseUser(cred.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatFirebaseError(err);
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
    requestedRole: UserRole = 'Auditor'
  ) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const nowIso = new Date().toISOString();
      const userRef = doc(db, 'users', cred.user.uid);
      const isBootstrap = email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      // Mandated: New registrations start as PENDING with USER role until approved by Admin
      const initialRole: UserRole = isBootstrap ? 'Admin' : 'USER';
      const initialStatus: UserStatus = isBootstrap ? 'APPROVED' : 'PENDING';
      const initialUserId = isBootstrap ? 'CVS-ADMIN-000001' : null;

      const newProfile: UserProfileData = {
        uid: cred.user.uid,
        name: name.trim() || email.split('@')[0],
        full_name: name.trim() || email.split('@')[0],
        email: email.trim(),
        mobile_number: mobile?.trim() || '',
        role: initialRole,
        status: initialStatus,
        user_id: initialUserId,
        created_at: nowIso,
        approved_at: isBootstrap ? nowIso : null,
        approved_by: isBootstrap ? 'SYSTEM_BOOTSTRAP' : null,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        lastLoginAt: nowIso,
        avatar: '',
      };

      try {
        await setDoc(userRef, newProfile);
      } catch (err) {
        console.warn('Could not write registration profile to Firestore:', err);
      }

      const appUser = mapDocToUser(cred.user.uid, newProfile, email.trim());
      setFirebaseUser(cred.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign In with Google Federated Identity
  const signInWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const appUser = await syncUserProfile(cred.user);
      setFirebaseUser(cred.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset with strict email validation and error feedback
  const resetPassword = async (email: string): Promise<string> => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error('Please enter a valid email address.');
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      return 'Password reset instructions have been sent to your registered email.';
    } catch (err: unknown) {
      const msg = formatFirebaseError(err);
      throw new Error(msg);
    }
  };

  // Sign Out
  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Fetch list of users for Admin User Management View
  const refreshUsersList = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as UserProfileData;
        list.push(mapDocToUser(docSnap.id, d));
      });

      // Sort with PENDING users at the top, then newest registrations
      list.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      setAllUsers(list);
    } catch (err) {
      console.warn('Could not fetch Firestore users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Admin Action: Approve a pending registration
  const approveUser = async (userId: string, assignedRole: UserRole = 'Auditor'): Promise<string> => {
    const target = allUsers.find(u => u.id === userId);
    const newUserId = target?.userId || generateForensicUserId();
    const nowIso = new Date().toISOString();
    const adminUid = auth.currentUser?.uid || 'admin';

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'APPROVED',
        role: assignedRole,
        approved_at: nowIso,
        approved_by: adminUid,
        user_id: newUserId,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
      });
    } catch (err) {
      console.warn('Firestore approval update warning:', err);
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
    const nowIso = new Date().toISOString();
    const adminUid = auth.currentUser?.uid || 'admin';
    const finalReason = reason?.trim() || 'Registration request not approved by forensic administrator.';

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'REJECTED',
        rejected_at: nowIso,
        rejected_by: adminUid,
        rejection_reason: finalReason,
      });
    } catch (err) {
      console.warn('Firestore rejection update warning:', err);
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
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      console.warn('Firestore update role failed:', err);
    }
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  // Admin Action: Toggle Active / Disabled
  const toggleUserStatus = async (userId: string, newStatus: 'Active' | 'Disabled') => {
    const statusVal: UserStatus = newStatus === 'Active' ? 'APPROVED' : 'Disabled';
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: statusVal });
    } catch (err) {
      console.warn('Firestore status toggle failed:', err);
    }
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: statusVal } : u));
  };

  // Admin Action: Manually provision pre-approved user
  const provisionUser = async (user: { name: string; email: string; role: UserRole; mobile?: string }) => {
    const newId = `usr-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const newUserId = generateForensicUserId();
    const adminUid = auth.currentUser?.uid || 'admin';

    const newProfile: UserProfileData = {
      uid: newId,
      name: user.name,
      full_name: user.name,
      email: user.email,
      mobile_number: user.mobile || '',
      role: user.role,
      status: 'APPROVED',
      user_id: newUserId,
      created_at: nowIso,
      approved_at: nowIso,
      approved_by: adminUid,
      lastLoginAt: 'Never',
    };

    try {
      const userRef = doc(db, 'users', newId);
      await setDoc(userRef, newProfile);
    } catch (err) {
      console.warn('Firestore manual provision failed:', err);
    }

    const newUserObj = mapDocToUser(newId, newProfile);
    setAllUsers(prev => [newUserObj, ...prev]);
  };

  // Status & Role calculations
  const role: UserRole = currentUser?.role || 'USER';
  const status: UserStatus = currentUser?.status || 'PENDING';
  const isAuthenticated = !!currentUser && !!firebaseUser;
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
        firebaseUser,
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
