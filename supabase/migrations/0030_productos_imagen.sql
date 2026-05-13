-- Añade columna imagen_url a productos para mostrar fotos en catálogo.
alter table public.productos
  add column if not exists imagen_url text;
