-- Fan picks: who wins (and, in "placar exato" mode, the series score), locked once the match starts.
create table public.picks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  match_id text not null references public.matches (id) on delete cascade,
  team_id text not null,
  home_score smallint check (home_score between 0 and 3),
  away_score smallint check (away_score between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
create index picks_match_idx on public.picks (match_id);
alter table public.picks enable row level security;

-- A pick can be made or changed only while the match is still scheduled, and only for one of its two teams.
create function public.pick_is_open(p_match text, p_team text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches m where m.id = p_match and m.status = 'scheduled'
    and coalesce(m.scheduled_time, m.start_time) > now() and p_team in (m.home_team_id, m.away_team_id));
$$;
revoke execute on function public.pick_is_open(text, text) from public, anon;
grant execute on function public.pick_is_open(text, text) to authenticated;

create policy "Users read their own picks" on public.picks for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users pick open matches" on public.picks for insert to authenticated with check ((select auth.uid()) = user_id and public.pick_is_open(match_id, team_id));
create policy "Users change open picks" on public.picks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and public.pick_is_open(match_id, team_id));
create policy "Users drop open picks" on public.picks for delete to authenticated using ((select auth.uid()) = user_id and public.pick_is_open(match_id, team_id));

-- "72% da galera foi de LOUD": pick counts per team, without exposing who picked.
create function public.pick_split(match_ids text[]) returns table (match_id text, team_id text, picks bigint)
language sql stable security definer set search_path = '' as $$
  select p.match_id, p.team_id, count(*) from public.picks p where p.match_id = any (match_ids) group by 1, 2;
$$;
revoke execute on function public.pick_split(text[]) from public;
grant execute on function public.pick_split(text[]) to anon, authenticated;

-- Ranking: 10 points for the right winner, 15 more for the exact series score, counted on finished matches since a date.
create function public.pick_leaderboard(since timestamptz, max_rows int default 20)
returns table (user_id uuid, display_name text, avatar text, points bigint, hits bigint, total bigint)
language sql stable security definer set search_path = '' as $$
  select p.user_id, pr.display_name, pr.avatar,
    sum(case when p.team_id = case when m.home_score > m.away_score then m.home_team_id else m.away_team_id end
      then 10 + case when p.home_score = m.home_score and p.away_score = m.away_score then 15 else 0 end else 0 end),
    count(*) filter (where p.team_id = case when m.home_score > m.away_score then m.home_team_id else m.away_team_id end),
    count(*)
  from public.picks p
  join public.matches m on m.id = p.match_id and m.status = 'finished' and m.home_score is distinct from m.away_score
  left join public.profiles pr on pr.id = p.user_id
  where coalesce(m.scheduled_time, m.start_time) >= since
  group by 1, 2, 3 order by 4 desc, 5 desc limit least(max_rows, 100);
$$;
revoke execute on function public.pick_leaderboard(timestamptz, int) from public;
grant execute on function public.pick_leaderboard(timestamptz, int) to anon, authenticated;
