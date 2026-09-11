alter table public.clothes
add column if not exists tags text[] not null default '{}';

alter table public.outfits
add column if not exists tags text[] not null default '{}';
