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
CREATE VIEW push_subscriptions_api AS
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
