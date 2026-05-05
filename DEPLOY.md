# Primar-IA Deploy Checklist

## Railway Setup
1. Create 2 Railway services: `primaria-api` and `primaria-web`
2. Set env vars in Railway dashboard (see apps/api/railway.toml comments)
3. For API: set DATABASE_URL to internal Railway Postgres URL
4. For Web: set NEXT_PUBLIC_API_URL to the API Railway URL
5. Run Prisma migration: `npx prisma migrate deploy` in Railway shell

## DNS (IONOS)
1. Add CNAME: `app.primar-ia.com` → Railway web service domain
2. Add CNAME: `api.primar-ia.com` → Railway API service domain
3. DO NOT touch primar-ia.com root (WordPress active)

## Post-deploy verification
- [ ] GET https://api.primar-ia.com/health → {"status":"ok"}
- [ ] https://app.primar-ia.com/login → Login page loads
- [ ] Stripe webhook URL: https://api.primar-ia.com/api/v1/stripe/webhook
