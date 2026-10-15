-- One-shot schedules for the reset notice. Apply separately, after the function is
-- deployed, RESET_NOTICE_SECRET is set, and a dry run looks right.
-- Prereq (Vault, done by the owner in the SQL editor, not in this file):
--   select vault.create_secret('<same value as RESET_NOTICE_SECRET>', 'reset_notice_secret');
-- Times are UTC: Sun Oct 25 2026 1:15 PM PT = 20:15 UTC; Tue Oct 27 10:15 AM PT = 17:15 UTC.
-- pg_cron has no year field, so each job unschedules itself after running once.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'reset-notice-initial',
  '15 20 25 10 *',
  $job$
  select net.http_post(
    url := 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1/send-reset-notice',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reset-notice-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reset_notice_secret')
    ),
    body := '{"mode":"initial"}'::jsonb,
    timeout_milliseconds := 120000
  );
  select cron.unschedule('reset-notice-initial');
  $job$
);

select cron.schedule(
  'reset-notice-reminder',
  '15 17 27 10 *',
  $job$
  select net.http_post(
    url := 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1/send-reset-notice',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reset-notice-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reset_notice_secret')
    ),
    body := '{"mode":"reminder"}'::jsonb,
    timeout_milliseconds := 120000
  );
  select cron.unschedule('reset-notice-reminder');
  $job$
);

-- Rollback: select cron.unschedule('reset-notice-initial'); select cron.unschedule('reset-notice-reminder');
