drop policy if exists "Users can read own outfits" on public.outfits;

create policy "Users can read own outfits"
on public.outfits for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or exists (
    select 1
    from public.friendships f
    where f.owner_id = (select auth.uid())
      and f.friend_id = public.outfits.owner_id
  )
);
