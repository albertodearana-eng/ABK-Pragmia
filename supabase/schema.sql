-- ============================================================
-- ABK PRAGMIA — Schema de base de datos
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ── USUARIOS (socios ABK) ────────────────────────────────────
create table public.usuarios (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text not null unique,
  rol text not null default 'corredor' check (rol in ('admin', 'corredor', 'readonly')),
  created_at timestamptz default now()
);

-- Trigger para crear usuario automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.usuarios (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── CLIENTES ─────────────────────────────────────────────────
create table public.clientes (
  id uuid default uuid_generate_v4() primary key,
  nombre_cliente text not null,           -- nombre del grupo / como se le conoce
  sector text,
  descripcion_actividad text,
  persona_contacto text,
  email_contacto text,
  telefono_contacto text,
  facturacion_anual numeric,              -- opcional
  num_empleados integer,                  -- opcional
  logo_url text,                          -- logo del cliente para exportaciones
  corredor_id uuid references public.usuarios(id),
  estado text default 'activo' check (estado in ('activo', 'en_proceso', 'inactivo')),
  notas_internas text,
  proxima_accion text,
  proxima_accion_fecha date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── RAZONES SOCIALES (N por cliente) ─────────────────────────
create table public.razones_sociales (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  razon_social text not null,
  cif text not null,
  direccion_fiscal text,
  es_principal boolean default false,
  created_at timestamptz default now()
);

-- ── PÓLIZAS (una por ramo por cliente) ───────────────────────
create table public.polizas (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  ramo text not null check (ramo in (
    'danos', 'rc_general', 'rc_do', 'cyber', 'transporte', 'credito', 'otro'
  )),
  estado text default 'vigente' check (estado in (
    'vigente', 'cancelada', 'en_renovacion', 'vencida', 'no_contratada'
  )),
  nota_comercial text,                    -- para estado "no_contratada → ¿valorar?"
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(cliente_id, ramo)                -- una póliza por ramo por cliente
);

-- ── VERSIONES DE PÓLIZA (el histórico vive aquí) ─────────────
create table public.versiones_poliza (
  id uuid default uuid_generate_v4() primary key,
  poliza_id uuid references public.polizas(id) on delete cascade not null,
  tipo_documento text not null check (tipo_documento in (
    'nueva', 'renovacion', 'suplemento', 'actualizacion_capitales', 'otro'
  )),
  -- Datos comunes a todos los ramos
  tomador text,
  aseguradora text,
  numero_poliza text,
  vigencia_desde date,
  vencimiento date,
  prima_neta numeric,
  impuestos numeric,
  otros_recargos numeric,
  prima_total numeric,
  -- Datos específicos del ramo (estructura flexible)
  datos_ramo jsonb default '{}',
  -- Metadatos
  pdf_url text,                           -- enlace al PDF original en Storage
  resumen_cambios text,                   -- extraído por Claude
  validada boolean default false,
  validada_por uuid references public.usuarios(id),
  validada_at timestamptz,
  notas_corredor text,
  siniestralidad_resumen text,            -- campo simple MVP
  created_at timestamptz default now()
);

-- ── SITUACIONES DE RIESGO (solo para ramo Daños) ─────────────
create table public.situaciones_riesgo (
  id uuid default uuid_generate_v4() primary key,
  version_poliza_id uuid references public.versiones_poliza(id) on delete cascade not null,
  orden integer default 1,               -- para reordenar
  referencia text,                       -- ej. 86-5035850-001
  nombre_personalizado text,             -- nombre que pone el corredor
  asegurado_situacion text,
  direccion text,
  descripcion_actividad text,
  -- Construcción
  construccion_estructura text,
  construccion_cubierta text,
  construccion_cerramientos text,
  inflamables text,
  pci text,
  seguridad_antirrobo text,
  indice_revalorizacion text,
  notas text,
  created_at timestamptz default now()
);

-- ── CAPITALES ASEGURADOS (por situación) ─────────────────────
create table public.capitales (
  id uuid default uuid_generate_v4() primary key,
  situacion_id uuid references public.situaciones_riesgo(id) on delete cascade not null,
  bien text not null,                    -- ej. "Edificio / Continente"
  capital numeric,
  modalidad text,                        -- ej. "Valor total"
  notas text,
  orden integer default 1,
  created_at timestamptz default now()
);

-- ── RIESGOS (mapa de riesgos) ─────────────────────────────────
create table public.riesgos (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  numero integer,
  categoria text,
  descripcion text,
  probabilidad integer check (probabilidad between 1 and 5),
  impacto integer check (impacto between 1 and 5),
  score integer generated always as (probabilidad * impacto) stored,
  nivel text generated always as (
    case
      when (probabilidad * impacto) >= 16 then 'extremo'
      when (probabilidad * impacto) >= 9  then 'alto'
      when (probabilidad * impacto) >= 4  then 'moderado'
      else 'bajo'
    end
  ) stored,
  control_actual text,
  accion_mitigacion text,
  poliza_id uuid references public.polizas(id),   -- póliza que cubre este riesgo
  responsable_cliente text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ── ALERTAS ───────────────────────────────────────────────────
create table public.alertas (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  poliza_id uuid references public.polizas(id),
  tipo text default 'manual' check (tipo in ('vencimiento', 'manual')),
  titulo text not null,
  accion text,
  responsable text,
  fecha_limite date,
  estado text default 'pendiente' check (estado in ('pendiente', 'en_curso', 'completada')),
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.razones_sociales enable row level security;
alter table public.polizas enable row level security;
alter table public.versiones_poliza enable row level security;
alter table public.situaciones_riesgo enable row level security;
alter table public.capitales enable row level security;
alter table public.riesgos enable row level security;
alter table public.alertas enable row level security;

-- Políticas: cada usuario ve sus propios datos
-- (En Fase 5 se ajustarán para multi-usuario con roles)

create policy "usuarios_own" on public.usuarios
  for all using (auth.uid() = id);

create policy "clientes_own" on public.clientes
  for all using (auth.uid() = corredor_id);

create policy "razones_sociales_via_cliente" on public.razones_sociales
  for all using (
    exists (select 1 from public.clientes c where c.id = cliente_id and c.corredor_id = auth.uid())
  );

create policy "polizas_via_cliente" on public.polizas
  for all using (
    exists (select 1 from public.clientes c where c.id = cliente_id and c.corredor_id = auth.uid())
  );

create policy "versiones_via_poliza" on public.versiones_poliza
  for all using (
    exists (
      select 1 from public.polizas p
      join public.clientes c on c.id = p.cliente_id
      where p.id = poliza_id and c.corredor_id = auth.uid()
    )
  );

create policy "situaciones_via_version" on public.situaciones_riesgo
  for all using (
    exists (
      select 1 from public.versiones_poliza vp
      join public.polizas p on p.id = vp.poliza_id
      join public.clientes c on c.id = p.cliente_id
      where vp.id = version_poliza_id and c.corredor_id = auth.uid()
    )
  );

create policy "capitales_via_situacion" on public.capitales
  for all using (
    exists (
      select 1 from public.situaciones_riesgo sr
      join public.versiones_poliza vp on vp.id = sr.version_poliza_id
      join public.polizas p on p.id = vp.poliza_id
      join public.clientes c on c.id = p.cliente_id
      where sr.id = situacion_id and c.corredor_id = auth.uid()
    )
  );

create policy "riesgos_via_cliente" on public.riesgos
  for all using (
    exists (select 1 from public.clientes c where c.id = cliente_id and c.corredor_id = auth.uid())
  );

create policy "alertas_via_cliente" on public.alertas
  for all using (
    exists (select 1 from public.clientes c where c.id = cliente_id and c.corredor_id = auth.uid())
  );

-- ── STORAGE: bucket para PDFs ─────────────────────────────────
insert into storage.buckets (id, name, public) 
values ('polizas-pdf', 'polizas-pdf', false)
on conflict (id) do nothing;

create policy "pdf_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'polizas-pdf' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "pdf_read_own" on storage.objects
  for select using (
    bucket_id = 'polizas-pdf' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── FUNCIÓN: actualizar updated_at automáticamente ────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_clientes_updated_at before update on public.clientes
  for each row execute procedure public.update_updated_at();

create trigger update_polizas_updated_at before update on public.polizas
  for each row execute procedure public.update_updated_at();

-- ── FUNCIÓN: crear alertas de vencimiento automáticamente ─────
create or replace function public.crear_alerta_vencimiento()
returns trigger language plpgsql security definer as $$
declare
  v_cliente_id uuid;
begin
  -- Obtener cliente_id a través de la póliza
  select p.cliente_id into v_cliente_id
  from public.polizas p where p.id = new.poliza_id;

  -- Si vencimiento en menos de 90 días, crear alerta
  if new.vencimiento is not null and new.vencimiento <= (current_date + interval '90 days') then
    insert into public.alertas (cliente_id, poliza_id, tipo, titulo, accion, fecha_limite, estado)
    values (
      v_cliente_id,
      new.poliza_id,
      'vencimiento',
      'Vencimiento próximo: ' || new.aseguradora || ' — ' || new.numero_poliza,
      'Revisar condiciones y cotizar renovación',
      new.vencimiento,
      'pendiente'
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_version_created
  after insert on public.versiones_poliza
  for each row execute procedure public.crear_alerta_vencimiento();
