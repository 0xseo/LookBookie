alter table public.clothes
add column if not exists color_value text,
add column if not exists color_family text;

alter table public.outfits
add column if not exists canvas_width real,
add column if not exists canvas_height real;

alter table public.friendships
add column if not exists status text,
add column if not exists accepted_at timestamptz;

update public.friendships
set status = 'accepted',
    accepted_at = coalesce(accepted_at, created_at)
where status is null;

alter table public.friendships
alter column status set default 'pending';

alter table public.friendships
alter column status set not null;

alter table public.friendships
drop constraint if exists friendships_status_check;

alter table public.friendships
add constraint friendships_status_check
check (status in ('pending', 'accepted'));

create index if not exists friendships_status_owner_idx
on public.friendships(status, owner_id);

create index if not exists friendships_status_friend_idx
on public.friendships(status, friend_id);

create or replace function public.guard_friendship_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.owner_id <> old.owner_id or new.friend_id <> old.friend_id then
    raise exception 'friendship participants cannot be changed';
  end if;

  if old.status = 'accepted' and new.status <> 'accepted' then
    raise exception 'accepted friendships cannot return to pending';
  end if;

  if old.status = 'pending' and new.status <> 'accepted' then
    raise exception 'pending friendships can only be accepted';
  end if;

  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at = now();
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_friendship_update() from public;
revoke execute on function public.guard_friendship_update() from anon;
revoke execute on function public.guard_friendship_update() from authenticated;

drop trigger if exists guard_friendship_update_trigger on public.friendships;

create trigger guard_friendship_update_trigger
before update on public.friendships
for each row
execute function public.guard_friendship_update();

drop policy if exists "Users can read own friendships" on public.friendships;
drop policy if exists "Users can add own friendships" on public.friendships;
drop policy if exists "Users can delete own friendships" on public.friendships;
drop policy if exists "Users can accept incoming friendships" on public.friendships;

create policy "Users can read own friendships"
on public.friendships for select
to authenticated
using ((select auth.uid()) = owner_id or (select auth.uid()) = friend_id);

create policy "Users can add own friendships"
on public.friendships for insert
to authenticated
with check ((select auth.uid()) = owner_id and status = 'pending');

create policy "Users can accept incoming friendships"
on public.friendships for update
to authenticated
using ((select auth.uid()) = friend_id and status = 'pending')
with check ((select auth.uid()) = friend_id and status = 'accepted');

create policy "Users can delete own friendships"
on public.friendships for delete
to authenticated
using ((select auth.uid()) = owner_id or (select auth.uid()) = friend_id);

drop policy if exists "Users can read own clothes" on public.clothes;

create policy "Users can read own clothes"
on public.clothes for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.owner_id = (select auth.uid()) and f.friend_id = public.clothes.owner_id)
        or (f.friend_id = (select auth.uid()) and f.owner_id = public.clothes.owner_id)
      )
  )
);

drop policy if exists "Users can read own outfits" on public.outfits;

create policy "Users can read own outfits"
on public.outfits for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.owner_id = (select auth.uid()) and f.friend_id = public.outfits.owner_id)
        or (f.friend_id = (select auth.uid()) and f.owner_id = public.outfits.owner_id)
      )
  )
);
