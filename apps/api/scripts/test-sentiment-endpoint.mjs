import 'dotenv/config';
import { marketService } from '../dist/modules/market/market.service.js';
const r = await marketService.getLatestReport();
console.log(JSON.stringify(r, null, 2));
process.exit(0);
