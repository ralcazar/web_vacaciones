alter table public.leave_types add column use_until date;

update public.leave_types
set use_until = case
  when code = 'SI' then make_date(year, 6, 30)
  when code = 'V60' then (make_date(year + 1, 3, 1) - interval '1 day')::date
  else make_date(year, 12, 31)
end;

alter table public.leave_types alter column use_until set not null;

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
  insert into leave_types(user_id, year, code, name, annual_limit, color, position, use_until)
    select uid, selected_year, item->>'code', item->>'name', (item->>'limit')::integer, item->>'color', ordinality - 1, (item->>'useUntil')::date
    from jsonb_array_elements(payload->'dayTypes') with ordinality as values_with_order(item, ordinality);
  insert into holidays(user_id, year, date, name, scope)
    select uid, selected_year, (item->>'date')::date, item->>'name', item->>'scope'
    from jsonb_array_elements(payload->'holidays') item;
  insert into calendar_entries(user_id, year, date, leave_code)
    select uid, selected_year, key::date, value->>'code'
    from jsonb_each(payload->'days');
end;
$$;

create or replace function public.enforce_category_use_window()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  deadline date;
begin
  select use_until into deadline
  from public.leave_types
  where user_id = new.user_id and year = new.year and code = new.leave_code;

  if new.date < make_date(new.year, 1, 1)
    or new.date > deadline
    or (new.leave_code = 'SI' and new.date < make_date(new.year, 5, 16)) then
    raise exception 'La fecha está fuera del periodo de uso de la categoría.';
  end if;
  return new;
end;
$$;

create trigger enforce_category_use_window
before insert or update on public.calendar_entries
for each row execute function public.enforce_category_use_window();
