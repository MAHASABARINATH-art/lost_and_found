/*
# Smart Lost & Found - Core Schema

## Purpose
Creates the full database for a college Lost & Found system with two roles (user, admin).
Users report lost/found items, search, submit claims with ownership verification, and track return status.
Admins review claims, approve/reject, and mark items returned.

## Tables
1. profiles - extends auth.users with full_name, student_id, phone, role, status
2. lost_items - user-submitted lost item reports
3. found_items - user-submitted found item reports
4. matches - computed possible matches between lost and found items
5. claims - user claims on found items with verification answers
6. notifications - in-app notifications per user
7. admin_actions - audit log of admin decisions

## Security
- RLS enabled on every table
- Owner-scoped policies for users (auth.uid() = user_id)
- Admins get full access via is_admin() helper checking role = 'admin' in profiles
- Public read on lost_items/found_items so search works for all authenticated users
- Claims: owner can read own; admins read all; insert by owner only
- Notifications: owner only
- admin_actions: admin only
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  student_id text UNIQUE NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (created after profiles table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Lost items
CREATE TABLE IF NOT EXISTS public.lost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  date_lost date NOT NULL,
  time_lost text,
  location_lost text NOT NULL,
  color text,
  brand text,
  identifying_features text,
  image_url text,
  additional_information text,
  status text NOT NULL DEFAULT 'Lost' CHECK (status IN ('Lost','Found','Returned','Completed','Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lost_items" ON public.lost_items;
CREATE POLICY "select_lost_items" ON public.lost_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_lost" ON public.lost_items;
CREATE POLICY "insert_own_lost" ON public.lost_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lost" ON public.lost_items;
CREATE POLICY "update_own_lost" ON public.lost_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_lost" ON public.lost_items;
CREATE POLICY "delete_own_lost" ON public.lost_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Found items
CREATE TABLE IF NOT EXISTS public.found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  date_found date NOT NULL,
  time_found text,
  location_found text NOT NULL,
  color text,
  brand text,
  identifying_features text,
  image_url text,
  storage_location text,
  additional_information text,
  status text NOT NULL DEFAULT 'Found' CHECK (status IN ('Found','Claimed','Returned','Completed','Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_found_items" ON public.found_items;
CREATE POLICY "select_found_items" ON public.found_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_found" ON public.found_items;
CREATE POLICY "insert_own_found" ON public.found_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_found" ON public.found_items;
CREATE POLICY "update_own_found" ON public.found_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_found" ON public.found_items;
CREATE POLICY "delete_own_found" ON public.found_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id uuid NOT NULL REFERENCES public.lost_items(id) ON DELETE CASCADE,
  found_item_id uuid NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0,
  matching_reasons text,
  status text NOT NULL DEFAULT 'Possible' CHECK (status IN ('Possible','Reviewed','Confirmed','Dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_matches" ON public.matches;
CREATE POLICY "select_matches" ON public.matches FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_matches" ON public.matches;
CREATE POLICY "insert_matches" ON public.matches FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_matches" ON public.matches;
CREATE POLICY "update_matches" ON public.matches FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_matches" ON public.matches;
CREATE POLICY "delete_matches" ON public.matches FOR DELETE
  TO authenticated USING (true);

-- Claims
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  found_item_id uuid NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  lost_item_id uuid REFERENCES public.lost_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_answers jsonb NOT NULL DEFAULT '{}',
  proof_information text,
  status text NOT NULL DEFAULT 'Claim Submitted' CHECK (status IN ('Claim Submitted','Under Review','Approved','Rejected','Returned','Completed')),
  admin_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_claims" ON public.claims;
CREATE POLICY "select_claims" ON public.claims FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_claim" ON public.claims;
CREATE POLICY "insert_own_claim" ON public.claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_claims" ON public.claims;
CREATE POLICY "update_claims" ON public.claims FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_claim" ON public.claims;
CREATE POLICY "delete_own_claim" ON public.claims FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  related_type text,
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
CREATE POLICY "insert_own_notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Admin actions audit log
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_actions" ON public.admin_actions;
CREATE POLICY "select_admin_actions" ON public.admin_actions FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_admin_actions" ON public.admin_actions;
CREATE POLICY "insert_admin_actions" ON public.admin_actions FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lost_items_user_id ON public.lost_items(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON public.lost_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON public.lost_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_user_id ON public.found_items(user_id);
CREATE INDEX IF NOT EXISTS idx_found_items_category ON public.found_items(category);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON public.found_items(status);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON public.claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_found_item_id ON public.claims(found_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_lost_item_id ON public.matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_item_id ON public.matches(found_item_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_lost_items_updated_at ON public.lost_items;
CREATE TRIGGER trigger_lost_items_updated_at BEFORE UPDATE ON public.lost_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_found_items_updated_at ON public.found_items;
CREATE TRIGGER trigger_found_items_updated_at BEFORE UPDATE ON public.found_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_matches_updated_at ON public.matches;
CREATE TRIGGER trigger_matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_claims_updated_at ON public.claims;
CREATE TRIGGER trigger_claims_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, student_id, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'student_id', 'Unknown'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
