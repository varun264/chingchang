# Deploy with Vercel + GitHub Actions

This project is configured with a GitHub Actions workflow at `.github/workflows/vercel-deploy.yml`.

## 1) Connect repo to GitHub

Push this project to a GitHub repository, then set default branch to `main`.

## 2) Create Vercel project

In Vercel:

1. Create new project from your GitHub repo.
2. Copy `Project ID` and `Org ID` from project settings.
3. Create a Vercel token from account settings.

## 3) Add GitHub repository secrets

Add these secrets in GitHub repo settings:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 4) Add runtime environment variables in Vercel

Set these in Vercel Project -> Settings -> Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5) Trigger deployment

- Any push to `main` runs build + production deployment.
- Pull requests run install + build checks only.

## Optional: Deploy from CLI once

```bash
npx vercel login
npx vercel link
npx vercel --prod
```
