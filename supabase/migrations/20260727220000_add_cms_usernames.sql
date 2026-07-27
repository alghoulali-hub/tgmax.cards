alter table public.cms_users
  add column if not exists username text;

create unique index if not exists cms_users_username_unique
  on public.cms_users (lower(username))
  where username is not null;
