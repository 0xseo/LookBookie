drop trigger if exists guard_profile_friend_code_trigger on public.profiles;
drop function if exists public.guard_profile_friend_code();

alter table public.profiles
rename column friend_code to handle;

alter table public.profiles
drop constraint if exists profiles_friend_code_format;

drop index if exists public.profiles_friend_code_key;

update public.profiles
set handle = lower(handle);

alter table public.profiles
drop constraint if exists profiles_handle_format;

alter table public.profiles
add constraint profiles_handle_format
check (handle ~ '^[a-z0-9][a-z0-9._-]{2,19}$');

create unique index profiles_handle_lower_key
on public.profiles(lower(handle));

create or replace function public.normalize_profile_handle()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.handle is null or btrim(new.handle) = '' then
    new.handle := 'lb_' || lower(substr(replace(new.id::text, '-', ''), 1, 12));
  else
    new.handle := lower(btrim(new.handle));
  end if;

  if new.handle !~ '^[a-z0-9][a-z0-9._-]{2,19}$' then
    raise exception 'handle must be 3-20 lowercase letters, numbers, dots, underscores, or hyphens';
  end if;

  return new;
end;
$$;

revoke execute on function public.normalize_profile_handle() from public;
revoke execute on function public.normalize_profile_handle() from anon;
revoke execute on function public.normalize_profile_handle() from authenticated;

create trigger normalize_profile_handle_trigger
before insert or update of handle on public.profiles
for each row
execute function public.normalize_profile_handle();
