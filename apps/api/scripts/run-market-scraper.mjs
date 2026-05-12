// One-shot manual trigger for the weekly market report scraper.
// Usage:  node scripts/run-market-scraper.mjs   (run from apps/api/)
import 'dotenv/config';
import { marketService } from '../dist/modules/market/market.service.js';

console.log('[SCRAPER] Starting...');
const start = Date.now();
const result = await marketService.generateWeeklyReport();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`[SCRAPER] Done in ${elapsed}s`);
console.log(JSON.stringify(result, null, 2));
process.exit(result.generated ? 0 : 1);
