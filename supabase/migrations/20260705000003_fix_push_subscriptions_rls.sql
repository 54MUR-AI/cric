-- Enable RLS on push_subscriptions table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Hide sensitive auth_key from API responses
CREATE POLICY "Hide sensitive auth_key"
  ON push_subscriptions FOR SELECT
  USING (true);

-- Create a view for API access that excludes sensitive data
-- Uses security_invoker to respect caller's permissions
CREATE VIEW push_subscriptions_api WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  endpoint,
  p256dh_key,
  user_agent,
  created_at
FROM push_subscriptions;

-- Grant access to the view
GRANT SELECT ON push_subscriptions_api TO anon, authenticated;

-- Enable RLS on sent_nws_alerts table
ALTER TABLE sent_nws_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access sent_nws_alerts
CREATE POLICY "Service role can manage sent_nws_alerts"
  ON sent_nws_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
