create table if not exists profiles (
  id uuid primary key,
  name text not null,
  age int not null check (age > 0),
  height_cm int not null check (height_cm > 0),
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  training_days_per_week int not null check (training_days_per_week between 1 and 7),
  created_at timestamptz not null default now()
);

create table if not exists workout_sessions (
  id uuid primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  session_date date not null,
  sport text not null,
  focus text not null,
  warmup jsonb not null,
  main_set jsonb not null,
  cooldown jsonb not null,
  created_at timestamptz not null default now()
);

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

create table if not exists workout_logs (
  id uuid primary key,
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  completed boolean not null default false,
  rpe int check (rpe between 1 and 10),
  fatigue_score int check (fatigue_score between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);
