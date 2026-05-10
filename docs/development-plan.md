# Multi-Sport Workout + Diet App - Development Plan

## Product Vision
Build a personalized training platform that designs and tracks workouts for table tennis, badminton, cricket, football, agility, and strength, with daily diet plans aligned to each workout load.

## Phase 1 - MVP (In Progress)
1. App shell and dashboard page.
2. Weekly workout generator for six training categories.
3. Daily diet generator tied to session intensity.
4. Display daily macro targets and hydration.

## Phase 2 - User Input + Tracking
1. Profile setup (age, body stats, goals, equipment, injuries).
2. Editable weekly planner.
3. Session logging (sets, reps, time, RPE, pain, fatigue).
4. Nutrition logging and adherence tracking.

## Phase 3 - Intelligence and Progression
1. Progressive overload engine by sport and focus.
2. Auto deload and recovery logic for high fatigue.
3. Personal bests and performance trend charts.
4. Missed-session recovery and schedule rebalance.

## Phase 4 - Production Readiness
1. Authentication and secure data storage.
2. Notifications for training and meal timing.
3. Export and sharing of weekly plans.
4. QA, performance testing, and deployment.

## Technical Plan
- Frontend: Next.js + TypeScript.
- Core logic: reusable planner engine under `lib/planner`.
- Future backend: Supabase (Postgres + Auth + Row Level Security).
- Future mobile parity: React Native app can consume the same planner logic via API.

## Immediate Next Build Steps
1. Add profile form and persist user settings.
2. Add API route to generate plans from input profile.
3. Create tracking tables and local state for logs.
4. Add analytics cards: consistency, volume, and macro adherence.
