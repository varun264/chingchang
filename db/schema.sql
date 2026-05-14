create table if not exists profiles (
  id uuid primary key,
  user_id uuid unique,
  name text not null,
  age int not null check (age > 0),
  height_cm int not null check (height_cm > 0),
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  training_days_per_week int not null check (training_days_per_week between 1 and 7),
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists user_id uuid;
create unique index if not exists profiles_user_id_key on profiles(user_id) where user_id is not null;

create table if not exists workout_sessions (
  id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  session_date date not null,
  day_label text,
  sport text not null,
  focus text not null,
  sport_drills jsonb not null default '[]'::jsonb,
  strength_block jsonb not null default '[]'::jsonb,
  warmup jsonb not null,
  main_set jsonb not null,
  cooldown jsonb not null,
  created_at timestamptz not null default now()
);

alter table workout_sessions add column if not exists sport_drills jsonb not null default '[]'::jsonb;
alter table workout_sessions add column if not exists strength_block jsonb not null default '[]'::jsonb;
alter table workout_sessions add column if not exists day_label text;

create table if not exists diet_plans (
  id uuid primary key,
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  calories int not null,
  protein_g int not null,
  carbs_g int not null,
  fats_g int not null,
  hydration_liters numeric(3,1) not null,
  breakfast text not null,
  pre_workout_snack text not null,
  post_workout_meal text not null,
  lunch text not null,
  evening_snack text not null,
  dinner text not null,
  created_at timestamptz not null default now()
);

-- Create workout_logs if it doesn't exist
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  completed boolean not null default false,
  rpe int check (rpe between 1 and 10),
  fatigue_score int check (fatigue_score between 1 and 10),
  mood text check (mood in ('energized','good','neutral','tired','exhausted')),
  notes text,
  logged_at timestamptz not null default now()
);

-- Add session_id column if missing
alter table workout_logs add column if not exists session_id uuid references workout_sessions(id) on delete cascade;

-- Add log_id column if missing (for upsert idempotency)
alter table workout_logs add column if not exists log_id uuid;

create index if not exists workout_logs_session_id_idx on workout_logs(session_id);