import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carga .env.local manualmente (sin dotenv) para que DATABASE_URL esté disponible en tests
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (key && !(key in process.env)) process.env[key] = value;
}
