-- Tabla de mensajes del formulario de Contacto (Supabase > SQL Editor > New query > pegar > Run)
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  nombre text not null check (char_length(nombre) <= 120),
  correo text not null check (char_length(correo) <= 160),
  organizacion text check (char_length(organizacion) <= 160),
  asunto text not null check (char_length(asunto) <= 160),
  areas text check (char_length(areas) <= 300),
  modalidad text check (char_length(modalidad) <= 60),
  plazo text check (char_length(plazo) <= 60),
  presupuesto text check (char_length(presupuesto) <= 60),
  mensaje text not null check (char_length(mensaje) <= 3000)
);

-- Seguridad: cualquiera puede ESCRIBIR un mensaje, pero nadie puede leerlos con la llave pública.
-- Tú los lees entrando a Supabase > Table Editor > mensajes.
alter table public.mensajes enable row level security;
create policy "cualquiera puede enviar un mensaje" on public.mensajes
  for insert to anon with check (true);

-- Permiso explícito de escritura (necesario si el proyecto no expone las tablas automáticamente)
grant usage on schema public to anon;
grant insert on public.mensajes to anon;
