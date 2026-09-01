import React, { createContext, useContext, useEffect, useState } from 'react';
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
  handleFirestoreError,
  OperationType,
  FirebaseUser
} from '../services/firebase';
import { User, UserRole } from '../types';

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

export const ROLE_PERMISSIONS: Record<UserRole, ForensicAction[]> = {
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
};

export const hasRolePermission = (role: UserRole | undefined, action: ForensicAction): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
};

export const isUserAuthorized = (user: User | null | undefined, allowedRoles: UserRole[]): boolean => {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
};

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  authError: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string, role?: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
  
  // Role & Permission Utilities
  isAdmin: boolean;
  isAuditor: boolean;
  isViewer: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canPerform: (action: ForensicAction) => boolean;
  validatePermission: (
    action: ForensicAction, 
    onUnauthorized?: (reason: string) => void
  ) => boolean;

  // User Management for Admins
  allUsers: User[];
  isLoadingUsers: boolean;
  refreshUsersList: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  toggleUserStatus: (userId: string, newStatus: 'Active' | 'Disabled') => Promise<void>;
  provisionUser: (user: { name: string; email: string; role: UserRole }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Known initial administrator email from project config
const BOOTSTRAP_ADMIN_EMAIL = 'vm812728@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin User Management state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Sync profile with Firestore
  const syncUserProfile = async (fbUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, 'users', fbUser.uid);
    try {
      const snap = await getDoc(userRef);
      const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'Disabled') {
          await firebaseSignOut(auth);
          throw new Error('Your account has been disabled. Please contact the administrator.');
        }

        // Update last login
        try {
          await updateDoc(userRef, { lastLoginAt: nowIso });
        } catch {
          // Non-blocking update failure
        }

        const appUser: User = {
          id: fbUser.uid,
          username: (fbUser.email || fbUser.displayName || 'user').split('@')[0],
          fullName: data.name || fbUser.displayName || 'Authorized Forensic Officer',
          email: fbUser.email || data.email || '',
          role: (data.role as UserRole) || 'Auditor',
          avatar: data.avatar || fbUser.photoURL || undefined,
          status: data.status || 'Active',
          createdAt: data.createdAt || nowIso,
          lastLogin: nowIso,
          isFirebaseUser: true,
        };
        return appUser;
      } else {
        // Create initial profile in Firestore
        // If it's the bootstrap admin email or the first user, assign Admin
        const isDefaultAdmin = fbUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
        
        const newProfile = {
          uid: fbUser.uid,
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Forensic Officer'),
          email: fbUser.email || '',
          role: isDefaultAdmin ? 'Admin' : 'Auditor',
          status: 'Active',
          createdAt: nowIso,
          lastLoginAt: nowIso,
          avatar: fbUser.photoURL || '',
        };

        try {
          await setDoc(userRef, newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
        }

        const appUser: User = {
          id: fbUser.uid,
          username: (fbUser.email || 'officer').split('@')[0],
          fullName: newProfile.name,
          email: newProfile.email,
          role: newProfile.role as UserRole,
          avatar: newProfile.avatar || undefined,
          status: 'Active',
          createdAt: nowIso,
          lastLogin: nowIso,
          isFirebaseUser: true,
        };
        return appUser;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('disabled')) {
        throw err;
      }
      // If Firestore is offline or restricted, build local safe profile
      const appUser: User = {
        id: fbUser.uid,
        username: (fbUser.email || 'user').split('@')[0],
        fullName: fbUser.displayName || 'Forensic Officer',
        email: fbUser.email || '',
        role: fbUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ? 'Admin' : 'Auditor',
        avatar: fbUser.photoURL || undefined,
        status: 'Active',
        lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
        isFirebaseUser: true,
      };
      return appUser;
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
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
        console.error('Authentication Error:', err);
        setAuthError(err instanceof Error ? err.message : 'Authentication verification error.');
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const formatFirebaseError = (error: unknown): string => {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return error instanceof Error ? error.message : 'An unknown authentication error occurred.';
    }
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
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
        return 'Unable to connect. Please check your internet connection and try again.';
      default:
        return (error as { message?: string }).message || 'Authentication failed. Please verify credentials.';
    }
  };

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const appUser = await syncUserProfile(cred.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up / Register with Email & Password
  const signUpWithEmail = async (name: string, email: string, pass: string, role: UserRole = 'Auditor') => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const userRef = doc(db, 'users', cred.user.uid);
      
      const newProfile = {
        uid: cred.user.uid,
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        role,
        status: 'Active',
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };

      try {
        await setDoc(userRef, newProfile);
      } catch (err) {
        console.warn('Could not write new profile to Firestore:', err);
      }

      const appUser: User = {
        id: cred.user.uid,
        username: email.split('@')[0],
        fullName: newProfile.name,
        email: newProfile.email,
        role,
        status: 'Active',
        createdAt: nowIso,
        lastLogin: nowIso,
        isFirebaseUser: true,
      };
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign In with Google
  const signInWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const appUser = await syncUserProfile(cred.user);
      setCurrentUser(appUser);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset
  const resetPassword = async (email: string): Promise<string> => {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return 'If an account exists for this email, a password reset email has been requested.';
    } catch {
      // Per security mandate: Do not reveal whether an email exists
      return 'If an account exists for this email, a password reset email has been requested.';
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

  // Fetch list of users for User Management View
  const refreshUsersList = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          username: (d.email || d.name || 'user').split('@')[0],
          fullName: d.name || 'Officer',
          email: d.email || '',
          role: (d.role as UserRole) || 'Auditor',
          status: (d.status as 'Active' | 'Disabled') || 'Active',
          createdAt: d.createdAt || '2026-08-20',
          lastLogin: d.lastLoginAt || d.createdAt || 'N/A',
          isFirebaseUser: true,
        });
      });

      // If empty in Firestore, include standard defaults
      if (list.length === 0) {
        setAllUsers([
          {
            id: 'usr-admin-1',
            username: 'admin',
            fullName: 'Chief Examination Auditor',
            email: 'admin.cctv@examination-agency.gov.in',
            role: 'Admin',
            status: 'Active',
            createdAt: '2026-08-01 09:00:00',
            lastLogin: '2026-08-30 09:15:22',
            isFirebaseUser: false,
          },
          {
            id: 'usr-auditor-1',
            username: 'auditor_01',
            fullName: 'Senior CCTV Forensic Auditor',
            email: 'auditor.delhi@examination-agency.gov.in',
            role: 'Auditor',
            status: 'Active',
            createdAt: '2026-08-10 11:30:00',
            lastLogin: '2026-08-30 10:42:01',
            isFirebaseUser: false,
          },
          {
            id: 'usr-viewer-1',
            username: 'viewer_ops',
            fullName: 'Operations Desk Officer',
            email: 'viewer.ops@examination-agency.gov.in',
            role: 'Viewer',
            status: 'Active',
            createdAt: '2026-08-15 14:20:00',
            lastLogin: '2026-08-30 08:30:11',
            isFirebaseUser: false,
          },
        ]);
      } else {
        setAllUsers(list);
      }
    } catch (err) {
      console.warn('Could not fetch Firestore users (using offline list):', err);
      setAllUsers([
        {
          id: 'usr-admin-1',
          username: 'admin',
          fullName: 'Chief Examination Auditor',
          email: 'admin.cctv@examination-agency.gov.in',
          role: 'Admin',
          status: 'Active',
          createdAt: '2026-08-01 09:00:00',
          lastLogin: '2026-08-30 09:15:22',
        },
        {
          id: 'usr-auditor-1',
          username: 'auditor_01',
          fullName: 'Senior CCTV Forensic Auditor',
          email: 'auditor.delhi@examination-agency.gov.in',
          role: 'Auditor',
          status: 'Active',
          createdAt: '2026-08-10 11:30:00',
          lastLogin: '2026-08-30 10:42:01',
        },
        {
          id: 'usr-viewer-1',
          username: 'viewer_ops',
          fullName: 'Operations Desk Officer',
          email: 'viewer.ops@examination-agency.gov.in',
          role: 'Viewer',
          status: 'Active',
          createdAt: '2026-08-15 14:20:00',
          lastLogin: '2026-08-30 08:30:11',
        },
      ]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      console.warn('Firestore update failed, updating local state:', err);
    }
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  const toggleUserStatus = async (userId: string, newStatus: 'Active' | 'Disabled') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
    } catch (err) {
      console.warn('Firestore status toggle failed, updating local state:', err);
    }
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
  };

  const provisionUser = async (user: { name: string; email: string; role: UserRole }) => {
    const newId = `usr-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newProfile = {
      uid: newId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'Active' as const,
      createdAt: nowIso,
      lastLoginAt: 'Never',
    };

    try {
      const userRef = doc(db, 'users', newId);
      await setDoc(userRef, newProfile);
    } catch (err) {
      console.warn('Firestore create profile failed, adding to local state:', err);
    }

    const newUserObj: User = {
      id: newId,
      username: user.email.split('@')[0],
      fullName: user.name,
      email: user.email,
      role: user.role,
      status: 'Active',
      createdAt: nowIso,
      lastLogin: 'Never',
    };

    setAllUsers(prev => [newUserObj, ...prev]);
  };

  // Role & Permission Checks
  const isAdmin = currentUser?.role === 'Admin';
  const isAuditor = currentUser?.role === 'Auditor';
  const isViewer = currentUser?.role === 'Viewer';

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!currentUser || !currentUser.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(currentUser.role);
  };

  const canPerform = (action: ForensicAction): boolean => {
    if (!currentUser || !currentUser.role) return false;
    return hasRolePermission(currentUser.role, action);
  };

  const validatePermission = (
    action: ForensicAction, 
    onUnauthorized?: (reason: string) => void
  ): boolean => {
    if (!currentUser) {
      const reason = 'Authentication required to perform this action.';
      if (onUnauthorized) onUnauthorized(reason);
      return false;
    }
    const permitted = hasRolePermission(currentUser.role, action);
    if (!permitted) {
      const reason = `Access Denied: Your role (${currentUser.role}) does not have permission to execute '${action}'. Contact a System Administrator.`;
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
        authError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        signOutUser,
        clearAuthError,
        isAdmin,
        isAuditor,
        isViewer,
        hasRole,
        canPerform,
        validatePermission,
        allUsers,
        isLoadingUsers,
        refreshUsersList,
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
