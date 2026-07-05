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
  USING (true)
  WITH CHECK (false);

-- Create a computed column for API responses that excludes auth_key
ALTER TABLE push_subscriptions
  ADD COLUMN api_endpoint TEXT GENERATED ALWAYS AS (endpoint) STORED,
  ADD COLUMN api_p256dh_key TEXT GENERATED ALWAYS AS (p256dh_key) STORED,
  ADD COLUMN api_auth_key TEXT GENERATED ALWAYS AS (auth_key) STORED,
  ADD COLUMN api_user_agent TEXT GENERATED ALWAYS AS (user_agent) STORED,
  ADD COLUMN api_created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at) STORED;

-- Create a view for API access that excludes sensitive data
CREATE VIEW push_subscriptions_api AS
SELECT
  id,
  user_id,
  api_endpoint,
  api_p256dh_key,
  api_user_agent,
  api_created_at
FROM push_subscriptions;

-- Grant access to the view
GRANT SELECT ON push_subscriptions_api TO anon, authenticated;
