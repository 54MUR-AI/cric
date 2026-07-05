-- Sync super admin status with Secretary board position
-- When someone is assigned as Secretary, they become super admin
-- When they lose the Secretary position, super admin is revoked
-- Function definition is in 20260704000001_fix_linter_warnings.sql

create trigger trg_sync_secretary_admin
  after insert or update or delete on officers
  for each row execute function public.sync_secretary_admin();
