alter table public.profiles
alter column email drop not null;

alter table public.profiles
add column if not exists friend_code text;

update public.profiles
set friend_code = 'LB-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where friend_code is null;

alter table public.profiles
alter column friend_code set not null;

alter table public.profiles
drop constraint if exists profiles_friend_code_format;

alter table public.profiles
add constraint profiles_friend_code_format
check (friend_code ~ '^LB-[0-9A-F]{12}$');

create unique index if not exists profiles_friend_code_key
on public.profiles(friend_code);

create or replace function public.guard_profile_friend_code()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.friend_code := 'LB-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
  elsif new.friend_code is distinct from old.friend_code then
    raise exception 'friend code cannot be changed';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_friend_code() from public;
revoke execute on function public.guard_profile_friend_code() from anon;
revoke execute on function public.guard_profile_friend_code() from authenticated;

drop trigger if exists guard_profile_friend_code_trigger on public.profiles;

create trigger guard_profile_friend_code_trigger
before insert or update on public.profiles
for each row
execute function public.guard_profile_friend_code();
