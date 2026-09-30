alter table public.clothes
add column if not exists fit_sizes text[] not null default '{}';

create table if not exists public.fits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  remote_image_url text not null,
  storage_path text not null,
  clothing_record_ids uuid[] not null default '{}',
  outfit_record_id uuid,
  created_at timestamptz not null default now()
);

alter table public.fits enable row level security;

create index if not exists fits_owner_created_at_idx
on public.fits(owner_id, created_at desc);

drop policy if exists "Users can read own fits" on public.fits;
drop policy if exists "Users can insert own fits" on public.fits;
drop policy if exists "Users can update own fits" on public.fits;
drop policy if exists "Users can delete own fits" on public.fits;

create policy "Users can read own fits"
on public.fits for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can insert own fits"
on public.fits for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update own fits"
on public.fits for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own fits"
on public.fits for delete
to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on table public.fits to authenticated;
