create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (owner_id <> friend_id),
  constraint friendships_owner_friend_unique unique (owner_id, friend_id)
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;

create index if not exists profiles_email_idx on public.profiles(lower(email));
create index if not exists friendships_owner_id_idx on public.friendships(owner_id);
create index if not exists friendships_friend_id_idx on public.friendships(friend_id);

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read own friendships" on public.friendships;
drop policy if exists "Users can add own friendships" on public.friendships;
drop policy if exists "Users can delete own friendships" on public.friendships;

create policy "Users can read own friendships"
on public.friendships for select
to authenticated
using ((select auth.uid()) = owner_id or (select auth.uid()) = friend_id);

create policy "Users can add own friendships"
on public.friendships for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own friendships"
on public.friendships for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can read own clothes" on public.clothes;

create policy "Users can read own clothes"
on public.clothes for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or exists (
    select 1
    from public.friendships f
    where f.owner_id = (select auth.uid())
      and f.friend_id = public.clothes.owner_id
  )
);
