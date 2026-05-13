/**
 * scripts/demo-login.ts
 *
 * Imprime los URLs de login instantáneo para la demo a Manna.
 * No genera nada — solo recuerda los links que ya están listos.
 *
 * Uso:
 *   pnpm tsx scripts/demo-login.ts
 *
 * Requisitos: dev server corriendo en http://localhost:3000
 */
const BASE = 'http://localhost:3000/api/dev-login';

const LINKS = [
  {
    label: 'Admin plataforma (admin@orion.demo)',
    goesTo: '/admin — Dashboard Orión',
    url: `${BASE}?email=admin@orion.demo`,
  },
  {
    label: 'Lucas — picker de empresas (lucas@orion.demo)',
    goesTo: '/seleccionar-empresa — elige Idex o Agroalves',
    url: `${BASE}?email=lucas@orion.demo&to=picker`,
  },
  {
    label: 'Lucas — directo a Idex',
    goesTo: '/idex — Dashboard del tenant',
    url: `${BASE}?email=lucas@orion.demo`,
  },
];

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   LINKS DE LOGIN INSTANTÁNEO — DEMO MANNA                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('Solo funciona con dev server local. Pega cada URL en el browser.\n');

for (const l of LINKS) {
  console.log(`▶ ${l.label}`);
  console.log(`  Va a: ${l.goesTo}`);
  console.log(`  ${l.url}\n`);
}
