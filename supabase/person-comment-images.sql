-- ============================================================
-- Watchruum · Screenshots on actor comments
-- Run this once in the Supabase SQL editor, BEFORE deploying the code.
-- Safe to re-run (idempotent).
--
-- Adds an image_urls column to person_comments. Screenshots reuse the existing
-- public "review-images" storage bucket (created by review-images.sql), so no
-- new bucket or policies are needed here.
-- ============================================================

alter table person_comments
  add column if not exists image_urls text[] not null default '{}';
