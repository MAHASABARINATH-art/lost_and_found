/*
# Add Foreign Keys to profiles for PostgREST Join Support

## Problem
Admin pages query lost_items, found_items, and claims with nested joins to
`profiles` (e.g. `select('*, profiles:profiles(full_name, email)')`). However,
these tables have foreign keys to `auth.users(id)`, not to `profiles(id)`.
PostgREST cannot resolve a join between `lost_items` and `profiles` because
there is no direct foreign key relationship — it returns error PGRST200:
"Could not find a relationship between 'lost_items' and 'profiles' in the
schema cache".

This is why Total Users works (simple count on profiles) but Lost Reports,
Found Reports, and Claims all fail (they all use nested profiles joins).

## Fix
Add foreign keys from:
- lost_items.user_id → profiles(id)
- found_items.user_id → profiles(id)
- claims.user_id → profiles(id)

Since profiles.id is itself a FK to auth.users(id) with ON DELETE CASCADE,
these new FKs are safe — they reference the same valid user IDs. The FKs
are DEFERRABLE INITIALLY DEFERRED to avoid ordering issues during inserts
(the profile row is created by a trigger after the auth.users row).

## Security
No RLS or policy changes. These are pure schema relationship additions.
*/

-- Add FK from lost_items.user_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lost_items_user_id_profiles_fkey'
    AND conrelid = 'public.lost_items'::regclass
  ) THEN
    ALTER TABLE public.lost_items
      ADD CONSTRAINT lost_items_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Add FK from found_items.user_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'found_items_user_id_profiles_fkey'
    AND conrelid = 'public.found_items'::regclass
  ) THEN
    ALTER TABLE public.found_items
      ADD CONSTRAINT found_items_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Add FK from claims.user_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claims_user_id_profiles_fkey'
    AND conrelid = 'public.claims'::regclass
  ) THEN
    ALTER TABLE public.claims
      ADD CONSTRAINT claims_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
