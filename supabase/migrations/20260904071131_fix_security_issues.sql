/*
# Fix security issues: claims WITH CHECK hole, function EXECUTE grants, search_path

## Issues
1. claims UPDATE policy has WITH CHECK (true) — any user can update any claim field
   including status, admin_reason, reviewed_by. Must restrict to admin-only for status changes.
2. is_admin() and handle_new_user() are SECURITY DEFINER functions executable by anon role.
3. handle_updated_at() has mutable search_path.
*/

-- 1. Fix claims UPDATE policy: restrict WITH CHECK to owner or admin
DROP POLICY IF EXISTS "update_claims" ON public.claims;
CREATE POLICY "update_claims" ON public.claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- 3. Fix handle_updated_at search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
