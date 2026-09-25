/*
# Fix Admin RLS Policies for Notifications and Profiles

## Problem
1. **Notifications INSERT policy** requires `auth.uid() = user_id`. When an admin
   approves/rejects a claim and calls `createNotification()` to notify the *claimant*,
   the insert is silently rejected because the admin's `auth.uid()` does not match
   the claimant's `user_id`. Result: users never receive claim status notifications.

2. **Profiles UPDATE policy** requires `auth.uid() = id` with no `is_admin()` check.
   When an admin tries to suspend/activate a user from AdminUsersPage, the update
   is silently rejected. Result: admin cannot manage user accounts.

## Changes
1. Notifications: add `is_admin()` as an alternative condition to the INSERT policy
   so admins can create notifications for any user.
2. Profiles: add `is_admin()` as an alternative condition to the UPDATE policy so
   admins can update user profiles (e.g. suspend/activate).

## Security
- `is_admin()` is a SECURITY DEFINER function with `row_security = off` that checks
  whether `auth.uid()` maps to a profile with `role = 'admin'`. It is safe to use
  as an RLS predicate.
- Non-admin users are still restricted to their own rows — the `OR is_admin()`
  branch only evaluates to true for actual admins.
*/

-- Fix 1: Allow admins to insert notifications for any user (for claim status updates)
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

-- Fix 2: Allow admins to update profiles (for suspend/activate user management)
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());
