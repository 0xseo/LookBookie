alter table public.outfits
add column if not exists seasons text[] not null default '{}';
