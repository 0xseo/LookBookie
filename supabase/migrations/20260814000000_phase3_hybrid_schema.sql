create extension if not exists pgcrypto;

create table if not exists public.clothes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  remote_image_url text not null,
  storage_path text not null,
  brand text,
  category text not null,
  seasons text[] not null default '{}',
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  stickers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.clothes enable row level security;
alter table public.outfits enable row level security;

drop policy if exists "Users can read own clothes" on public.clothes;
drop policy if exists "Users can insert own clothes" on public.clothes;
drop policy if exists "Users can update own clothes" on public.clothes;
drop policy if exists "Users can delete own clothes" on public.clothes;

create policy "Users can read own clothes"
on public.clothes for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own clothes"
on public.clothes for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own clothes"
on public.clothes for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own clothes"
on public.clothes for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can read own outfits" on public.outfits;
drop policy if exists "Users can insert own outfits" on public.outfits;
drop policy if exists "Users can update own outfits" on public.outfits;
drop policy if exists "Users can delete own outfits" on public.outfits;

create policy "Users can read own outfits"
on public.outfits for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own outfits"
on public.outfits for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own outfits"
on public.outfits for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own outfits"
on public.outfits for delete
to authenticated
using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clothes',
  'clothes',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own clothing images" on storage.objects;
drop policy if exists "Users can update own clothing images" on storage.objects;
drop policy if exists "Users can delete own clothing images" on storage.objects;

create policy "Users can upload own clothing images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'clothes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own clothing images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'clothes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'clothes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own clothing images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'clothes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
