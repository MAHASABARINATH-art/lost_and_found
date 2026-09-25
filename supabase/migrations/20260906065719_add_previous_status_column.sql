/*
# Add previous_status column to lost_items and found_items

## Purpose
When an admin archives a report, the current `status` is overwritten with
'Archived'. Without saving the prior status, there is no way to restore the
report to its original state. This migration adds a `previous_status` column
to both `lost_items` and `found_items` so the archive operation can save the
original status and the restore operation can set it back.

## Changes
1. `lost_items.previous_status` — nullable text, stores the status the item
   had before it was archived.
2. `found_items.previous_status` — nullable text, same purpose.

## Backfill
Any rows that are already 'Archived' get `previous_status` set to a sensible
default ('Lost' for lost_items, 'Found' for found_items) since we cannot
recover the true original status retroactively.

## Security
No RLS or policy changes. These are pure schema additions.
*/

ALTER TABLE public.lost_items
  ADD COLUMN IF NOT EXISTS previous_status text;

ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS previous_status text;

-- Backfill: for already-archived rows, set a sensible default
UPDATE public.lost_items SET previous_status = 'Lost'
  WHERE status = 'Archived' AND previous_status IS NULL;

UPDATE public.found_items SET previous_status = 'Found'
  WHERE status = 'Archived' AND previous_status IS NULL;
