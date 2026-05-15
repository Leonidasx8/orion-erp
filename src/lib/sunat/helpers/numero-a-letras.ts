const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
  'VEINTIUNO',
  'VEINTIDÓS',
  'VEINTITRÉS',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISÉIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE',
];

const DECENAS = [
  '',
  '',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertirEntero(n: number): string {
  if (n === 0) return 'CERO';
  if (n < 30) return UNIDADES[n];
  if (n < 100) {
    const dec = Math.floor(n / 10);
    const uni = n % 10;
    return uni === 0 ? DECENAS[dec] : `${DECENAS[dec]} Y ${UNIDADES[uni]}`;
  }
  if (n === 100) return 'CIEN';
  if (n < 1000) {
    const cen = Math.floor(n / 100);
    const resto = n % 100;
    return CENTENAS[cen] + (resto > 0 ? ` ${convertirEntero(resto)}` : '');
  }
  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    const milesStr = miles === 1 ? 'MIL' : `${convertirEntero(miles)} MIL`;
    return milesStr + (resto > 0 ? ` ${convertirEntero(resto)}` : '');
  }
  if (n < 1_000_000_000) {
    const mill = Math.floor(n / 1_000_000);
    const resto = n % 1_000_000;
    const millStr = mill === 1 ? 'UN MILLÓN' : `${convertirEntero(mill)} MILLONES`;
    return millStr + (resto > 0 ? ` ${convertirEntero(resto)}` : '');
  }
  return String(n);
}

export function numeroALetras(amount: number, moneda: 'PEN' | 'USD' = 'PEN'): string {
  const entero = Math.floor(amount);
  const centavos = Math.round((amount - entero) * 100);
  const monedaStr = moneda === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES';
  const cc = String(centavos).padStart(2, '0');
  return `${convertirEntero(entero)} CON ${cc}/100 ${monedaStr}`;
}
