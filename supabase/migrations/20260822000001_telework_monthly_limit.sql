create or replace function public.enforce_monthly_telework_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.leave_code = 'TT' and (
    select count(*)
    from public.calendar_entries
    where user_id = new.user_id
      and leave_code = 'TT'
      and date_trunc('month', date) = date_trunc('month', new.date)
      and date <> new.date
  ) >= 10 then
    raise exception 'No se pueden añadir más de 10 días de teletrabajo en un mismo mes.';
  end if;
  return new;
end;
$$;

create trigger enforce_monthly_telework_limit
before insert or update on public.calendar_entries
for each row execute function public.enforce_monthly_telework_limit();
