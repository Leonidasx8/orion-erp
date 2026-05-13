import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);

/**
 * Seedea imágenes para productos del catálogo de Idex (productos eléctricos).
 * Usa Unsplash con query terms para mantener consistencia visual.
 */
const IMAGE_MAP: Record<string, string> = {
  // Cables
  CAB: 'https://images.unsplash.com/photo-1601275623891-3a3019fdcab7?w=400&h=300&fit=crop&q=80',
  // Tubería
  TUB: 'https://images.unsplash.com/photo-1631153302091-1f0f4a4f5fb3?w=400&h=300&fit=crop&q=80',
  // Terminales
  TER: 'https://images.unsplash.com/photo-1605522561233-768ad7a8fabf?w=400&h=300&fit=crop&q=80',
  // Llaves
  LLV: 'https://images.unsplash.com/photo-1605493725784-b6c39c0c0e3a?w=400&h=300&fit=crop&q=80',
  // Conectores
  CON: 'https://images.unsplash.com/photo-1605493725784-b6c39c0c0e3a?w=400&h=300&fit=crop&q=80',
  // Default eléctrico
  DEFAULT: 'https://images.unsplash.com/photo-1620283085439-39620a1e21c4?w=400&h=300&fit=crop&q=80',
};

async function main() {
  const productos = await sql`SELECT id, codigo FROM productos WHERE imagen_url IS NULL`;
  let updated = 0;
  for (const p of productos) {
    const prefix = p.codigo.split('-')[0];
    const url = IMAGE_MAP[prefix] ?? IMAGE_MAP.DEFAULT;
    await sql`UPDATE productos SET imagen_url = ${url} WHERE id = ${p.id}`;
    updated++;
  }
  console.log(`${updated} productos actualizados con imagen`);
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
