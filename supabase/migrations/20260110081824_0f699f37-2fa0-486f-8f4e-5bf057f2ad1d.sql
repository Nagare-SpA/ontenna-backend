-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- Account type enum
CREATE TYPE public.account_type AS ENUM ('end_user', 'team_supervisor', 'super_admin');

-- Verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');

-- App role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('super_admin', 'team_supervisor', 'end_user');


-- =====================================================
-- 2. CREATE USER_ROLES TABLE (for secure role checks)
-- =====================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'end_user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 3. CREATE SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


-- =====================================================
-- 4. CREATE PROFILES TABLE
-- =====================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  mother_user_id TEXT,
  account_type public.account_type NOT NULL DEFAULT 'end_user',
  first_name TEXT,
  last_name TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 5. CREATE VERIFICATION_CODES TABLE
-- =====================================================

CREATE TABLE public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 6. RLS POLICIES FOR USER_ROLES
-- =====================================================

-- Users can read their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can insert roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can update roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can delete roles
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));


-- =====================================================
-- 7. RLS POLICIES FOR PROFILES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow profile creation during signup (service role)
CREATE POLICY "Allow profile creation"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);


-- =====================================================
-- 8. RLS POLICIES FOR VERIFICATION_CODES
-- =====================================================

-- Users can view their own verification codes
CREATE POLICY "Users can view their own verification codes"
ON public.verification_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow verification code creation (service role handles this)
CREATE POLICY "Service role can manage verification codes"
ON public.verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- =====================================================
-- 9. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================
-- 10. TRIGGER: AUTO-CREATE PROFILE ON USER SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (
    id, email, mother_user_id, account_type, first_name, last_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'mother_user_id',
    COALESCE(
      (NEW.raw_user_meta_data ->> 'account_type')::public.account_type,
      'end_user'
    ),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Create default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'account_type')::public.app_role,
      'end_user'
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================
-- 11. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX idx_verification_codes_user_id ON public.verification_codes(user_id);
CREATE INDEX idx_verification_codes_code ON public.verification_codes(code);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);