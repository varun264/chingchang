# Supabase Edge Functions

Created functions:

1. `generate-plan`
   - Method: `POST`
   - Generates weekly workout + diet plan and saves to `profiles`, `workout_sessions`, and `diet_plans`.

2. `get-latest-plan`
   - Method: `GET`
   - Reads profile and all linked workout + diet rows.
   - Query param: `profileId`

## Deploy

```bash
supabase login
supabase link --project-ref mttoicstadpjafzxgowq
supabase functions deploy generate-plan
supabase functions deploy get-latest-plan
```

## Invoke examples

```bash
curl -X POST "https://mttoicstadpjafzxgowq.functions.supabase.co/generate-plan" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Varun","age":20,"heightCm":172,"weightKg":68,"trainingDaysPerWeek":7}'
```

```bash
curl "https://mttoicstadpjafzxgowq.functions.supabase.co/get-latest-plan?profileId=<PROFILE_ID>" \
  -H "apikey: <SUPABASE_ANON_KEY>"
```

## Notes

- Both functions are configured with `verify_jwt = false` in `supabase/config.toml` for quick integration.
- In Supabase project settings, ensure `SUPABASE_SERVICE_ROLE_KEY` is added as an Edge Function secret.
