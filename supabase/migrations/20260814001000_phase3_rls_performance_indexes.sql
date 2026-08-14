create index if not exists clothes_owner_id_idx on public.clothes(owner_id);
create index if not exists outfits_owner_id_idx on public.outfits(owner_id);

drop policy if exists "Users can read own clothes" on public.clothes;
drop policy if exists "Users can insert own clothes" on public.clothes;
drop policy if exists "Users can update own clothes" on public.clothes;
drop policy if exists "Users can delete own clothes" on public.clothes;

create policy "Users can read own clothes"
on public.clothes for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can insert own clothes"
on public.clothes for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update own clothes"
on public.clothes for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own clothes"
on public.clothes for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can read own outfits" on public.outfits;
drop policy if exists "Users can insert own outfits" on public.outfits;
drop policy if exists "Users can update own outfits" on public.outfits;
drop policy if exists "Users can delete own outfits" on public.outfits;

create policy "Users can read own outfits"
on public.outfits for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can insert own outfits"
on public.outfits for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update own outfits"
on public.outfits for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own outfits"
on public.outfits for delete
to authenticated
using ((select auth.uid()) = owner_id);
