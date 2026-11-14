-- Search that forgives typos: "laud" or "laude" still finds LOUD, "kru" finds KRÜ.
-- Matches by substring, by edit distance (a letter or two off) and by sound (double metaphone).
create extension if not exists fuzzystrmatch with schema extensions;

create or replace function public.search_catalog(q text, max_rows int default 40)
returns table (kind text, id text, name text, acronym text, logo_url text, country text, region text, elo real)
language sql
stable
set search_path = ''
as $$
  with input as (
    select lower(trim(q)) as q, greatest(1, length(trim(q)) / 3) as slack
  ),
  teams as (
    select 'team'::text as kind, t.id, t.name, t.acronym, t.logo_url, t.country, null::text as region, e.elo::real as elo
    from public.teams t
    left join public.team_elo e on e.team_id = t.id
    cross join input i
    where length(i.q) >= 2 and (
      lower(t.name) like '%' || i.q || '%'
      or lower(coalesce(t.acronym, '')) like i.q || '%'
      or extensions.levenshtein(lower(split_part(t.name, ' ', 1)), i.q) <= i.slack
      or extensions.levenshtein(lower(left(t.name, 60)), i.q) <= i.slack
      or extensions.dmetaphone(split_part(t.name, ' ', 1)) = extensions.dmetaphone(i.q)
    )
    order by e.elo desc nulls last
    limit max_rows
  ),
  competitions as (
    select 'competition'::text, c.id, c.name, null::text, c.logo_url, null::text, c.region, null::real
    from public.competitions c
    cross join input i
    where length(i.q) >= 2 and (
      lower(c.name) like '%' || i.q || '%'
      or extensions.levenshtein(lower(split_part(c.name, ' ', 1)), i.q) <= i.slack
      or extensions.dmetaphone(split_part(c.name, ' ', 1)) = extensions.dmetaphone(i.q)
    )
    limit max_rows
  )
  select * from teams
  union all
  select * from competitions;
$$;

grant execute on function public.search_catalog(text, int) to anon, authenticated;
