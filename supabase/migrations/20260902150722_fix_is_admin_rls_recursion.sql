/*
# Fix is_admin() recursive RLS issue

## Problem
The is_admin() function queries public.profiles to check the user's role.
The profiles table has RLS enabled, and the select_own_profile policy 
calls is_admin() — creating infinite recursion:
is_admin() → SELECT profiles → RLS → is_admin() → ...

This causes "database error querying schema" when admin logs in.

## Fix
Use CREATE OR REPLACE FUNCTION (no drop needed) to change the function
to add SET row_security = off, which makes the SECURITY DEFINER function
bypass RLS when querying profiles.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
