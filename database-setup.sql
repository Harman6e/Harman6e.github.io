-- Torn Deals database setup
-- Run this entire script once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game text not null,
  platform text not null,
  region text not null,
  account_type text not null default '',
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'USD',
  warranty_days integer not null default 0 check (warranty_days between 0 and 365),
  short_description text not null,
  description text not null,
  details jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('active','sold','draft')),
  featured boolean not null default false,
  ownership_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  brand_name text not null default 'Torn Deals',
  tagline text not null default 'Browse detailed game-account listings with clear pricing, screenshots, platform information, and direct support.',
  default_currency text not null default 'USD',
  whatsapp_number text not null default '',
  telegram_username text not null default '',
  support_email text not null default '',
  instagram_username text not null default '',
  announcement text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.listings enable row level security;
alter table public.site_settings enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.listings, public.site_settings to anon;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update on public.site_settings to authenticated;

drop policy if exists "Public can view active and sold listings" on public.listings;
create policy "Public can view active and sold listings" on public.listings for select to anon using (status in ('active','sold'));

drop policy if exists "Admin can view all listings" on public.listings;
create policy "Admin can view all listings" on public.listings for select to authenticated using (true);

drop policy if exists "Admin can add listings" on public.listings;
create policy "Admin can add listings" on public.listings for insert to authenticated with check (true);

drop policy if exists "Admin can update listings" on public.listings;
create policy "Admin can update listings" on public.listings for update to authenticated using (true) with check (true);

drop policy if exists "Admin can delete listings" on public.listings;
create policy "Admin can delete listings" on public.listings for delete to authenticated using (true);

drop policy if exists "Public can view site settings" on public.site_settings;
create policy "Public can view site settings" on public.site_settings for select to anon using (true);

drop policy if exists "Admin can view site settings" on public.site_settings;
create policy "Admin can view site settings" on public.site_settings for select to authenticated using (true);

drop policy if exists "Admin can add site settings" on public.site_settings;
create policy "Admin can add site settings" on public.site_settings for insert to authenticated with check (id = 1);

drop policy if exists "Admin can update site settings" on public.site_settings;
create policy "Admin can update site settings" on public.site_settings for update to authenticated using (id = 1) with check (id = 1);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin can list listing images" on storage.objects;
create policy "Admin can list listing images" on storage.objects for select to authenticated using (bucket_id = 'listing-images');

drop policy if exists "Admin can upload listing images" on storage.objects;
create policy "Admin can upload listing images" on storage.objects for insert to authenticated with check (bucket_id = 'listing-images');

drop policy if exists "Admin can update listing images" on storage.objects;
create policy "Admin can update listing images" on storage.objects for update to authenticated using (bucket_id = 'listing-images') with check (bucket_id = 'listing-images');

drop policy if exists "Admin can delete listing images" on storage.objects;
create policy "Admin can delete listing images" on storage.objects for delete to authenticated using (bucket_id = 'listing-images');