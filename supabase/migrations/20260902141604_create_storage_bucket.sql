/*
# Create item-images storage bucket

## Purpose
Creates a public storage bucket for lost/found item images.

## Changes
- Creates 'item-images' bucket if it doesn't exist
- Sets it to public so images can be viewed
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;
