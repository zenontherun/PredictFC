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
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)  -- default username from email
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
order by p.total_points desc;


-- 5. FUNCTION: Calculate & save points after result is entered
create or replace function public.calculate_points(p_match_id int)
returns void as $$
declare
  v_home int;
  v_away int;
  pred record;
  pts int;
  pred_outcome char;
  real_outcome char;
  pred_diff int;
  real_diff int;
begin
  -- Get match result (bypassing SELECT INTO which confuses the parser)
  v_home := (select result_home from public.matches where id = p_match_id);
  v_away := (select result_away from public.matches where id = p_match_id);

  if v_home is null or v_away is null then
    raise exception 'Match result not set yet';
  end if;

  -- Determine real outcome
  real_diff := v_home - v_away;
  if real_diff > 0 then real_outcome := 'H';
  elsif real_diff < 0 then real_outcome := 'A';
  else real_outcome := 'D';
  end if;

  -- Loop through all predictions for this match
  for pred in select * from public.predictions where match_id = p_match_id loop
    pred_diff := pred.predicted_home - pred.predicted_away;
    if pred_diff > 0 then pred_outcome := 'H';
    elsif pred_diff < 0 then pred_outcome := 'A';
    else pred_outcome := 'D';
    end if;

    -- Scoring logic
    if pred.predicted_home = v_home and pred.predicted_away = v_away then
      pts := 5;  -- Exact score
    elsif pred_outcome = real_outcome and pred_diff = real_diff then
      pts := 3;  -- Correct goal difference
    elsif pred_outcome = real_outcome then
      pts := 1;  -- Correct outcome only
    else
      pts := 0;
    end if;

    -- Save points on prediction
    update public.predictions
    set points_earned = pts
    where id = pred.id;

    -- Update user profile totals
    update public.profiles
    set
      total_points = total_points + pts,
      exact_scores = exact_scores + case when pts = 5 then 1 else 0 end,
      correct_outcomes = correct_outcomes + case when pts >= 1 then 1 else 0 end
    where id = pred.user_id;
  end loop;
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
