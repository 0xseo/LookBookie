alter table public.fits
add column if not exists name text not null default '',
add column if not exists worn_on date;

update public.fits set worn_on = (created_at at time zone 'Asia/Seoul')::date
where worn_on is null;
alter table public.fits alter column worn_on set default current_date;
alter table public.fits alter column worn_on set not null;

create policy "Accepted friends can read fits"
on public.fits for select to authenticated
using (
  owner_id in (
    select f.friend_id from public.friendships f
    where f.owner_id = (select auth.uid()) and f.status = 'accepted'
    union
    select f.owner_id from public.friendships f
    where f.friend_id = (select auth.uid()) and f.status = 'accepted'
  )
);
