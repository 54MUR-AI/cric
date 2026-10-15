-- Member password-reset notice (Oct 2026): send log + password-change tracking.

create table if not exists public.reset_notice_sends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('initial', 'reminder')),
  email text,
  status text not null check (status in ('sending', 'sent', 'failed')),
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, kind)
);
alter table public.reset_notice_sends enable row level security;
-- No policies: only the service role (edge function) can read/write.
revoke all on public.reset_notice_sends from anon, authenticated;

-- Records every password change (reset or in-app change). auth.audit_log_entries is
-- empty on this project, so it can't be used to tell who has reset.
create table if not exists public.password_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_at timestamptz not null default now()
);
create index if not exists password_changes_user_idx on public.password_changes (user_id, changed_at);
alter table public.password_changes enable row level security;
revoke all on public.password_changes from anon, authenticated;

create or replace function public.record_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    insert into public.password_changes (user_id) values (new.id);
  end if;
  return new;
end;
$$;
revoke execute on function public.record_password_change() from public, anon, authenticated;

drop trigger if exists on_auth_password_change on auth.users;
create trigger on_auth_password_change
  after update of encrypted_password on auth.users
  for each row execute function public.record_password_change();
