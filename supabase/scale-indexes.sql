-- =====================================================================
--  Watchruum — Scale-readiness indexes
--  Run in the Supabase SQL editor. Safe to re-run (create index if not exists).
--
--  Adds the high-value indexes that are MISSING from the current schema,
--  targeting the exact query shapes the app runs on hot paths. Existing
--  indexes (idx_comments_scope, idx_reviews_media, the reactions/follows
--  UNIQUE constraints, etc.) already cover many lookups; these fill the gaps
--  that only bite at scale. Indexes only speed up reads (and cost a little on
--  writes), so this is a low-risk change.
-- =====================================================================

-- reactions: like/reaction COUNTS are fetched by (target_type, target_id) for a
-- batch of ids on every review & comment list. The existing UNIQUE index leads
-- with user_id, so it can't serve a target-first lookup. This is the single
-- hottest missing index.
create index if not exists idx_reactions_target
  on reactions (target_type, target_id);

-- reviews: getReviewsForMedia filters by media_id and orders by created_at desc.
-- idx_reviews_media covers the filter; this composite also covers the ordering.
create index if not exists idx_reviews_media_created
  on reviews (media_id, created_at desc);

-- follows: "who follows me" / friend & presence queries filter by following_id.
-- The UNIQUE (follower_id, following_id) index only serves follower_id-first.
create index if not exists idx_follows_following
  on follows (following_id);

-- notifications: the inbox/bell feed reads a user's rows newest-first.
-- idx_notifications_user is (user_id, is_read); this adds time ordering.
create index if not exists idx_notifications_user_created
  on notifications (user_id, created_at desc);

-- watch_status: getTrackingCount() counts rows for a single media_id ("X people
-- tracking this title"). The UNIQUE (user_id, media_id) index leads with user_id,
-- so a media_id-only count isn't served. Runs on every title page in Live Mode.
create index if not exists idx_watch_status_media
  on watch_status (media_id);

-- reports: the "Undo report" delete filters by (reporter_id, target_type,
-- target_id); the moderation queue reads by status. Neither is indexed today.
create index if not exists idx_reports_reporter_target
  on reports (reporter_id, target_type, target_id);
create index if not exists idx_reports_target
  on reports (target_type, target_id);
create index if not exists idx_reports_status
  on reports (status);

-- =====================================================================
--  Optional but recommended once you have real traffic:
--    • Enable pg_stat_statements and review the slowest queries monthly.
--    • Run EXPLAIN ANALYZE on any query > ~50ms and add matching indexes.
--    • Re-check that every RLS policy's referenced column is indexed.
-- =====================================================================
