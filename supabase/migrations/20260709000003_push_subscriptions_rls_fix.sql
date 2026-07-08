-- Remove the over-permissive SELECT policy that leaked every user's push
-- auth_key / p256dh_key / endpoint to all authenticated users.
drop policy if exists "Hide sensitive auth_key" on push_subscriptions;
drop policy if exists "Users can manage own subscriptions" on push_subscriptions;

create policy "Users can manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
