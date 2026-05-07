import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  QR_HMAC_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_placeholder'),
  RESEND_API_KEY: z.string().default('re_placeholder'),
  EMAIL_FROM: z.string().email().default('noreply@primar-ia.com'),
  R2_ACCOUNT_ID: z.string().default('placeholder'),
  R2_ACCESS_KEY_ID: z.string().default('placeholder'),
  R2_SECRET_ACCESS_KEY: z.string().default('placeholder'),
  R2_BUCKET_NAME: z.string().default('primaria-uploads'),
  R2_PUBLIC_URL: z.string().url().default('https://uploads.primar-ia.com'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  STRIPE_PRICE_CAMPO: z.string().default(''),
  STRIPE_PRICE_FINCA: z.string().default(''),
  STRIPE_PRICE_LONJA: z.string().default(''),
  STRIPE_PRICE_CENTRAL: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
  const placeholders = ['sk_test_placeholder', 'whsec_placeholder', 're_placeholder', 'placeholder'];
  const entries = Object.entries(parsed.data) as [string, string][];
  for (const [key, value] of entries) {
    if (typeof value === 'string' && placeholders.includes(value)) {
      console.error(`FATAL: ${key} has a placeholder value in production`);
      process.exit(1);
    }
  }
}

export const env = parsed.data;
