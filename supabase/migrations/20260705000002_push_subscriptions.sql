-- Track which NWS alert IDs have been sent via push (prevents re-sending)
create table if not exists sent_nws_alerts (
  id bigserial primary key,
  alert_id text not null unique,
  event text,
  created_at timestamptz not null default now()
);

-- Grant access for the service role (used by edge function)
alter table sent_nws_alerts enable row level security;

-- Optional: pg_cron scheduled jobs (requires pg_cron + pg_net extensions)
-- Uncomment if your Supabase project has pg_cron enabled:
--
-- select cron.schedule(
--   'check-and-push',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1/check-and-push',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', concat('Bearer ', current_setting('supabase.service_role_key'))
--     )
--   ) as request_id;
--   $$
-- );
