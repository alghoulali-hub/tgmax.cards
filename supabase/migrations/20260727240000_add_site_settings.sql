create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

insert into public.site_settings (key, value)
values (
  'whatsapp',
  '{
    "phone_number": "96171234567",
    "display_number": "+961 71 234 567",
    "greeting": "Hi TGMAX!",
    "location": "Beirut, Lebanon",
    "reply_time": "Usually within an hour",
    "enabled": true
  }'::jsonb
)
on conflict (key) do nothing;
