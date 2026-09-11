-- ==============================================================================
-- CCTV CANDIDATE SEARCH & FORENSIC EVIDENCE WORKSTATION
-- Supabase PostgreSQL Schema & Row Level Security (RLS) Migration
-- ==============================================================================

-- 1. Create public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'Admin', 'ADMIN', 'SUPER_ADMIN', 'Auditor', 'Viewer')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'Active', 'Disabled')),
  user_id TEXT, -- Human-readable forensic officer ID e.g. CVS-US-892011
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  last_login_at TIMESTAMPTZ,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 3. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated_at ON public.profiles;
CREATE TRIGGER on_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Helper function to check if the caller is an active, approved Administrator
-- SECURITY DEFINER ensures this query runs with elevated privileges without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status IN ('APPROVED', 'Active')
      AND role IN ('Admin', 'ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Trigger to automatically provision public.profiles upon auth.users signup
-- This guarantees atomic profile creation without race conditions or client-side tampering
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
  extracted_mobile TEXT;
BEGIN
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  extracted_mobile := COALESCE(NEW.raw_user_meta_data->>'mobile', '');

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    mobile,
    role,
    status,
    user_id,
    approved_by,
    approved_at,
    rejected_by,
    rejected_at,
    rejection_reason,
    last_login_at,
    avatar,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    extracted_name,
    NEW.email,
    extracted_mobile,
    'USER',     -- Mandatory default: USER
    'PENDING',  -- Mandatory default: PENDING
    NULL,       -- No user_id until approved by an administrator
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    timezone('utc'::text, now()),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Trigger to strictly block privilege escalation on public.profiles updates
-- Prevents non-admins from changing role, status, user_id, or approval/rejection metadata
CREATE OR REPLACE FUNCTION public.enforce_profile_privilege_boundary()
RETURNS TRIGGER AS $$
BEGIN
  -- If caller is an approved admin, allow administrative edits
  IF public.is_admin() THEN
    -- If approving, record timestamp if not provided
    IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' AND NEW.approved_at IS NULL THEN
      NEW.approved_at = timezone('utc'::text, now());
    END IF;
    -- If rejecting, record timestamp if not provided
    IF NEW.status = 'REJECTED' AND OLD.status != 'REJECTED' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
  END IF;

  -- Caller is a normal user updating their own profile
  -- Block any attempt to self-promote, approve, reject, or assign user_id
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Privilege Violation: Only administrators can modify roles.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Privilege Violation: Only administrators can modify account status.';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Privilege Violation: Only administrators can assign or alter forensic User IDs.';
  END IF;
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Privilege Violation: Approval metadata is strictly managed by administrators.';
  END IF;
  IF NEW.rejected_by IS DISTINCT FROM OLD.rejected_by OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'Privilege Violation: Rejection metadata is strictly managed by administrators.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_privilege_check ON public.profiles;
CREATE TRIGGER on_profile_privilege_check
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_privilege_boundary();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies

-- Policy 1: SELECT (Read)
-- Unauthenticated users: BLOCKED (0 access)
-- Normal users: Can read only their own profile (id = auth.uid())
-- Administrators: Can read all profiles
DROP POLICY IF EXISTS "Profiles are readable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles are readable by owner or admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  );

-- Policy 2: INSERT (Create)
-- Handled securely by the database trigger on auth.users (handle_new_user).
-- Fallback policy allows users to insert their own PENDING profile or admins to insert.
DROP POLICY IF EXISTS "Users can insert their own pending profile" ON public.profiles;
CREATE POLICY "Users can insert their own pending profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      id = auth.uid() 
      AND role = 'USER' 
      AND status = 'PENDING' 
      AND user_id IS NULL 
      AND approved_by IS NULL 
      AND approved_at IS NULL 
      AND rejected_by IS NULL 
      AND rejected_at IS NULL
    )
    OR public.is_admin()
  );

-- Policy 3: UPDATE (Modify)
-- Normal users: Can update non-sensitive info on their own profile
-- Administrators: Can update profiles (approve, reject, assign roles, assign user_id)
DROP POLICY IF EXISTS "Owners can update profile and admins can update all" ON public.profiles;
CREATE POLICY "Owners can update profile and admins can update all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    id = auth.uid() OR public.is_admin()
  );

-- Policy 4: DELETE
-- Only administrators can delete profile records
DROP POLICY IF EXISTS "Only administrators can delete profiles" ON public.profiles;
CREATE POLICY "Only administrators can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- ==============================================================================
-- 9. SAFE INITIAL ADMINISTRATOR BOOTSTRAP INSTRUCTIONS (Run in Supabase SQL Editor)
-- ==============================================================================
-- To bootstrap the first administrator without backdoors or hardcoded emails:
-- 1. Sign up a new user via the application UI (e.g. admin@youragency.gov).
-- 2. Find their UUID in the Supabase Dashboard > Authentication > Users table.
-- 3. Run the following query in the Supabase SQL Editor (replace <ADMIN_UUID> with the actual UUID):
--
--    UPDATE public.profiles
--    SET 
--      role = 'Admin',
--      status = 'APPROVED',
--      user_id = 'CVS-ADMIN-000001',
--      approved_at = timezone('utc'::text, now()),
--      approved_by = NULL -- NULL explicitly documents initial bootstrap provisioning
--    WHERE id = '<ADMIN_UUID>'::UUID;
-- ==============================================================================
