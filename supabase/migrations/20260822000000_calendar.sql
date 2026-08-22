create table public.years (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  year integer not null check (year between 1900 and 2200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

create table public.leave_types (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  year integer not null,
  code text not null check (char_length(code) between 1 and 8),
  name text not null,
  annual_limit integer not null check (annual_limit >= 0),
  color text not null,
  position integer not null,
  primary key (user_id, year, code),
  foreign key (user_id, year) references public.years(user_id, year) on delete cascade
);

create table public.calendar_entries (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  year integer not null,
  date date not null,
  leave_code text not null,
  primary key (user_id, date),
  foreign key (user_id, year) references public.years(user_id, year) on delete cascade,
  foreign key (user_id, year, leave_code) references public.leave_types(user_id, year, code) on update cascade
);

create table public.holidays (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  year integer not null,
  date date not null,
  name text not null,
  scope text not null check (scope in ('national', 'regional', 'local')),
  primary key (user_id, date),
  foreign key (user_id, year) references public.years(user_id, year) on delete cascade
);

alter table public.years enable row level security;
alter table public.leave_types enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.holidays enable row level security;

revoke all on public.years, public.leave_types, public.calendar_entries, public.holidays from anon;
grant select, insert, update, delete on public.years, public.leave_types, public.calendar_entries, public.holidays to authenticated;

create policy "users manage their years" on public.years for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage their leave types" on public.leave_types for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage their entries" on public.calendar_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage their holidays" on public.holidays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.save_calendar_year(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  selected_year integer := (payload->>'year')::integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into years(user_id, year, updated_at) values(uid, selected_year, now())
    on conflict (user_id, year) do update set updated_at = now();
  delete from calendar_entries where user_id = uid and year = selected_year;
  delete from holidays where user_id = uid and year = selected_year;
  delete from leave_types where user_id = uid and year = selected_year;
  insert into leave_types(user_id, year, code, name, annual_limit, color, position)
    select uid, selected_year, item->>'code', item->>'name', (item->>'limit')::integer, item->>'color', ordinality - 1
    from jsonb_array_elements(payload->'dayTypes') with ordinality as values_with_order(item, ordinality);
  insert into holidays(user_id, year, date, name, scope)
    select uid, selected_year, (item->>'date')::date, item->>'name', item->>'scope'
    from jsonb_array_elements(payload->'holidays') item;
  insert into calendar_entries(user_id, year, date, leave_code)
    select uid, selected_year, key::date, value->>'code'
    from jsonb_each(payload->'days');
end;
$$;

revoke execute on function public.save_calendar_year(jsonb) from public;
grant execute on function public.save_calendar_year(jsonb) to authenticated;
