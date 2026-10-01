drop policy if exists "Accepted friends can read fits" on public.fits;
drop policy if exists "Users can read own fits" on public.fits;
create policy "Users and accepted friends can read fits"
on public.fits for select to authenticated
using (
  owner_id = (select auth.uid())
  or owner_id in (
    select f.friend_id from public.friendships f
    where f.owner_id = (select auth.uid()) and f.status = 'accepted'
    union
    select f.owner_id from public.friendships f
    where f.friend_id = (select auth.uid()) and f.status = 'accepted'
  )
);
