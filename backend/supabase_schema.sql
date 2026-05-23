-- ============================================
-- WORLD CUP 2026 PREDICTOR — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Clean up any existing tables from previous partial runs
drop view if exists public.leaderboard;
drop table if exists public.predictions cascade;
drop table if exists public.matches cascade;
drop table if exists public.profiles cascade;
drop function if exists public.calculate_points cascade;
drop function if exists public.handle_new_user cascade;

-- 1. USERS (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  avatar_emoji text default '⭐',
  total_points int default 0,
  exact_scores int default 0,
  correct_outcomes int default 0,
  role text default 'user',
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_username text;
  v_base_username text;
  v_counter int := 0;
begin
  v_base_username := split_part(new.email, '@', 1);
  v_username := v_base_username;
  
  -- Resolve username conflicts dynamically
  while exists (select 1 from public.profiles where username = v_username) loop
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter::text;
  end loop;

  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    v_username
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. MATCHES
create table public.matches (
  id serial primary key,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  match_date date not null,
  match_time time not null,
  group_name text,
  venue text,
  stage text default 'group',         -- group | round_of_16 | quarter | semi | final
  result_home int,                     -- null until admin enters result
  result_away int,                     -- null until admin enters result
  is_locked boolean default false,     -- lock before kickoff
  created_at timestamp with time zone default now()
);


-- 3. PREDICTIONS
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id int references public.matches(id) on delete cascade not null,
  predicted_home int not null,
  predicted_away int not null,
  points_earned int,                   -- calculated after result
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, match_id)            -- one prediction per user per match
);

-- Trigger to prevent predictions on locked matches
create or replace function public.check_prediction_lock()
returns trigger as $$
begin
  if (select is_locked from public.matches where id = new.match_id) = true then
    raise exception 'Predictions are closed for this match.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tr_check_prediction_lock
  before insert or update on public.predictions
  for each row execute procedure public.check_prediction_lock();


-- 4. LEADERBOARD VIEW (auto-calculated)
create or replace view public.leaderboard as
select
  p.id,
  p.username,
  p.avatar_emoji,
  p.total_points,
  p.exact_scores,
  p.correct_outcomes,
  rank() over (order by p.total_points desc) as rank
from public.profiles p
where p.role != 'superAdmin'
order by p.total_points desc;


-- 5. FUNCTION: Calculate & save points after result is entered (optimized set-based operations)
create or replace function public.calculate_points(p_match_id int)
returns void as $$
declare
  v_home int;
  v_away int;
  real_diff int;
  real_outcome char;
begin
  -- Get match result
  select result_home, result_away into v_home, v_away 
  from public.matches 
  where id = p_match_id;

  if v_home is null or v_away is null then
    raise exception 'Match result not set yet';
  end if;

  -- Determine real outcome
  real_diff := v_home - v_away;
  if real_diff > 0 then real_outcome := 'H';
  elsif real_diff < 0 then real_outcome := 'A';
  else real_outcome := 'D';
  end if;

  -- 1. Bulk Update Predictions (Set-Based scoring)
  update public.predictions
  set points_earned = case
    -- Exact Score (5 points)
    when predicted_home = v_home and predicted_away = v_away then 5
    -- Correct Goal Difference (3 points)
    when (predicted_home - predicted_away > 0 and real_outcome = 'H' and (predicted_home - predicted_away) = real_diff) or
         (predicted_home - predicted_away < 0 and real_outcome = 'A' and (predicted_home - predicted_away) = real_diff) or
         (predicted_home - predicted_away = 0 and real_outcome = 'D' and (predicted_home - predicted_away) = real_diff) then 3
    -- Correct Outcome Only (1 point)
    when (predicted_home - predicted_away > 0 and real_outcome = 'H') or
         (predicted_home - predicted_away < 0 and real_outcome = 'A') or
         (predicted_home - predicted_away = 0 and real_outcome = 'D') then 1
    else 0
  end
  where match_id = p_match_id;

  -- 2. Bulk Update Profiles in a single join query
  update public.profiles p
  set
    total_points = p.total_points + sub.points,
    exact_scores = p.exact_scores + sub.is_exact,
    correct_outcomes = p.correct_outcomes + sub.is_correct
  from (
    select 
      user_id,
      points_earned as points,
      case when points_earned = 5 then 1 else 0 end as is_exact,
      case when points_earned >= 1 then 1 else 0 end as is_correct
    from public.predictions
    where match_id = p_match_id
  ) sub
  where p.id = sub.user_id;
end;
$$ language plpgsql security definer;

-- 5b. FUNCTION: Undo points for a match (optimized set-based operations)
create or replace function public.undo_points(p_match_id int)
returns void as $$
begin
  -- 1. Update profiles in bulk by subtracting points earned from predictions of this match
  update public.profiles p
  set
    total_points = p.total_points - sub.points,
    exact_scores = p.exact_scores - sub.is_exact,
    correct_outcomes = p.correct_outcomes - sub.is_correct
  from (
    select 
      user_id,
      points_earned as points,
      case when points_earned = 5 then 1 else 0 end as is_exact,
      case when points_earned >= 1 then 1 else 0 end as is_correct
    from public.predictions
    where match_id = p_match_id and points_earned is not null
  ) sub
  where p.id = sub.user_id;

  -- 2. Reset points on predictions
  update public.predictions
  set points_earned = null
  where match_id = p_match_id;

  -- 3. Reset match result back to null
  update public.matches
  set result_home = null, result_away = null
  where id = p_match_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- 6. ADMIN VIEWS & FUNCTIONS
-- ============================================

create or replace view public.admin_users_view as
select 
  p.id,
  p.username,
  p.email,
  p.created_at,
  p.total_points,
  p.role,
  p.status,
  count(pr.id) as predictions_made
from public.profiles p
left join public.predictions pr on p.id = pr.user_id
group by p.id;

create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'superAdmin'
  );
$$ language sql security definer;


-- ============================================
-- ROW LEVEL SECURITY (RLS) — Important!
-- ============================================

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

-- Profiles: users can read all, edit only their own
create policy "Public profiles are viewable" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "SuperAdmins can update any profile" on public.profiles for update using (public.is_super_admin());
create policy "SuperAdmins can delete any profile" on public.profiles for delete using (public.is_super_admin());

-- Matches: everyone can read, superAdmins can update
create policy "Matches are public" on public.matches for select using (true);
create policy "SuperAdmins can update matches" on public.matches for update using (public.is_super_admin());

-- Predictions: users can read all, but only insert/update their own
create policy "Predictions are viewable" on public.predictions for select using (true);
create policy "Users can insert own predictions" on public.predictions for insert with check (auth.uid() = user_id);
create policy "Users can update own predictions" on public.predictions for update using (auth.uid() = user_id);
create policy "SuperAdmins can delete any prediction" on public.predictions for delete using (public.is_super_admin());


-- ============================================
-- 6. BONUS PREDICTIONS
-- ============================================

create table public.bonus_predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  golden_boot text,
  golden_glove text,
  golden_ball text,
  young_player text,
  fair_play text,
  player_of_match text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.bonus_predictions enable row level security;
create policy "Users can read all bonus_predictions" on public.bonus_predictions for select using (true);
create policy "Users can insert own bonus_predictions" on public.bonus_predictions for insert with check (auth.uid() = user_id);
create policy "Users can update own bonus_predictions" on public.bonus_predictions for update using (auth.uid() = user_id);

-- ============================================
-- SAMPLE MATCH DATA
-- ============================================

-- ============================================
-- 6. SAMPLE MATCH DATA (UPDATED FROM SCREENSHOTS)
-- ============================================

-- ============================================
-- 6. FULL OFFICIAL FIFA WORLD CUP 2026 SCHEDULE (GROUP STAGE)
-- ============================================

insert into public.matches (home_team, away_team, home_flag, away_flag, match_date, match_time, group_name, venue) values
-- June 12
('Mexico', 'South Africa', '🇲🇽', '🇿🇦', '2026-06-11', '19:00', 'A', 'Mexico City Stadium'),
('Korea Republic', 'Czechia', '🇰🇷', '🇨🇿', '2026-06-12', '02:00', 'A', 'Guadalajara Stadium'),
-- June 13
('Canada', 'Bosnia-Herzegovina', '🇨🇦', '🇧🇦', '2026-06-12', '19:00', 'B', 'Toronto Stadium'),
('USA', 'Paraguay', '🇺🇸', '🇵🇾', '2026-06-13', '01:00', 'D', 'Los Angeles Stadium'),
-- June 14
('Qatar', 'Switzerland', '🇶🇦', '🇨🇭', '2026-06-13', '19:00', 'B', 'San Francisco Bay Area Stadium'),
('Brazil', 'Morocco', '🇧🇷', '🇲🇦', '2026-06-13', '22:00', 'C', 'New York/New Jersey Stadium'),
('Haiti', 'Scotland', '🇭🇹', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-14', '01:00', 'C', 'Miami Stadium'),
('Australia', 'Türkiye', '🇦🇺', '🇹🇷', '2026-06-14', '02:00', 'D', 'Houston Stadium'),
('Germany', 'Curaçao', '🇩🇪', '🇨🇼', '2026-06-14', '17:00', 'E', 'Seattle Stadium'),
-- June 15
('Netherlands', 'Japan', '🇳🇱', '🇯🇵', '2026-06-14', '20:00', 'F', 'Dallas Stadium'),
('Côte d''Ivoire', 'Ecuador', '🇨🇮', '🇪🇨', '2026-06-14', '23:00', 'E', 'Philadelphia Stadium'),
('Sweden', 'Tunisia', '🇸🇪', '🇹🇳', '2026-06-15', '02:00', 'F', 'Monterrey Stadium'),
('Spain', 'Cabo Verde', '🇪🇸', '🇨🇻', '2026-06-15', '16:00', 'H', 'Atlanta Stadium'),
-- June 16
('Belgium', 'Egypt', '🇧🇪', '🇪🇬', '2026-06-15', '19:00', 'G', 'Seattle Stadium'),
('Saudi Arabia', 'Uruguay', '🇸🇦', '🇺🇾', '2026-06-15', '22:00', 'H', 'San Francisco Bay Area Stadium'),
('IR Iran', 'New Zealand', '🇮🇷', '🇳🇿', '2026-06-16', '01:00', 'G', 'Los Angeles Stadium'),
('France', 'Norway', '🇫🇷', '🇳🇴', '2026-06-16', '16:00', 'I', 'Boston Stadium'),
-- June 17
('Senegal', 'Iraq', '🇸🇳', '🇮🇶', '2026-06-16', '19:00', 'I', 'New York/New Jersey Stadium'),
('Argentina', 'Algeria', '🇦🇷', '🇩🇿', '2026-06-16', '22:00', 'J', 'Kansas City Stadium'),
('Austria', 'Jordan', '🇦🇹', '🇯🇴', '2026-06-17', '01:00', 'J', 'San Francisco Bay Area Stadium'),
('Portugal', 'Congo DR', '🇵🇹', '🇨🇩', '2026-06-17', '16:00', 'K', 'Houston Stadium'),
-- June 18
('Colombia', 'Uzbekistan', '🇨🇴', '🇺🇿', '2026-06-17', '19:00', 'K', 'Atlanta Stadium'),
('Brazil', 'Panama', '🇧🇷', '🇵🇦', '2026-06-17', '22:00', 'L', 'New York/New Jersey Stadium'),
('Morocco', 'Ghana', '🇲🇦', '🇬🇭', '2026-06-18', '01:00', 'L', 'Miami Stadium'),
('Czechia', 'South Africa', '🇨🇿', '🇿🇦', '2026-06-18', '16:00', 'A', 'Atlanta Stadium'),
-- June 19
('Mexico', 'Korea Republic', '🇲🇽', '🇰🇷', '2026-06-18', '19:00', 'A', 'Guadalajara Stadium'),
('Canada', 'Qatar', '🇨🇦', '🇶🇦', '2026-06-18', '22:00', 'B', 'BC Place Vancouver'),
('Switzerland', 'Bosnia-Herzegovina', '🇨🇭', '🇧🇦', '2026-06-19', '01:00', 'B', 'Los Angeles Stadium'),
('USA', 'Australia', '🇺🇸', '🇦🇺', '2026-06-19', '16:00', 'D', 'Seattle Stadium'),
-- June 20
('Türkiye', 'Paraguay', '🇹🇷', '🇵🇾', '2026-06-19', '19:00', 'D', 'San Francisco Bay Area Stadium'),
('Haiti', 'Brazil', '🇭🇹', '🇧🇷', '2026-06-19', '22:00', 'C', 'Philadelphia Stadium'),
('Morocco', 'Scotland', '🇲🇦', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-20', '01:00', 'C', 'Houston Stadium'),
('Germany', 'Ecuador', '🇩🇪', '🇪🇨', '2026-06-20', '16:00', 'E', 'Toronto Stadium'),
-- June 21
('Curaçao', 'Côte d''Ivoire', '🇨🇼', '🇨🇮', '2026-06-20', '19:00', 'E', 'Kansas City Stadium'),
('Netherlands', 'Sweden', '🇳🇱', '🇸🇪', '2026-06-20', '22:00', 'F', 'Houston Stadium'),
('Tunisia', 'Japan', '🇹🇳', '🇯🇵', '2026-06-21', '01:00', 'F', 'Monterrey Stadium'),
('Spain', 'Saudi Arabia', '🇪🇸', '🇸🇦', '2026-06-21', '16:00', 'H', 'Atlanta Stadium'),
-- June 22
('Belgium', 'IR Iran', '🇧🇪', '🇮🇷', '2026-06-21', '19:00', 'G', 'Los Angeles Stadium'),
('Uruguay', 'Cabo Verde', '🇺🇾', '🇨🇻', '2026-06-21', '22:00', 'H', 'Miami Stadium'),
('New Zealand', 'Egypt', '🇳🇿', '🇪🇬', '2026-06-22', '01:00', 'G', 'BC Place Vancouver'),
('Argentina', 'Austria', '🇦🇷', '🇦🇹', '2026-06-22', '17:00', 'J', 'Dallas Stadium'),
-- June 24
('France', 'Iraq', '🇫🇷', '🇮🇶', '2026-06-23', '21:00', 'I', 'Philadelphia Stadium'),
('Norway', 'Senegal', '🇳🇴', '🇸🇳', '2026-06-24', '00:00', 'I', 'New York/New Jersey Stadium'),
('Algeria', 'Jordan', '🇩🇿', '🇯🇴', '2026-06-24', '03:00', 'J', 'Seattle Stadium');

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
create index if not exists idx_predictions_match_id on public.predictions(match_id);
create index if not exists idx_predictions_user_id on public.predictions(user_id);
create index if not exists idx_profiles_total_points on public.profiles(total_points desc);
