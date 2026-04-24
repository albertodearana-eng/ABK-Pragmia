# ABK Pragmia — Plataforma de Gestión de Seguros

Plataforma interna para ABK Riesgos & Seguros. Gestión de pólizas de empresa con extracción automática de datos mediante IA (Claude).

## Stack

- **Next.js 15** — Frontend + Backend (App Router)
- **Supabase** — Base de datos (Postgres) + Storage (PDFs) + Auth
- **Anthropic Claude** — Extracción de datos de PDFs
- **Tailwind CSS** — Estilos
- **Vercel** — Hosting

## Setup local

### 1. Clonar el repositorio

```bash
git clone https://github.com/albertodearana-eng/ABK-Pragmia.git
cd ABK-Pragmia
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y rellena los valores:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus valores:

```
NEXT_PUBLIC_SUPABASE_URL=https://okwmyforvxpeciltevwa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
ANTHROPIC_API_KEY=tu-anthropic-api-key
```

### 3. Configurar la base de datos

1. Ve a **Supabase** → tu proyecto → **SQL Editor**
2. Copia y ejecuta el contenido de `supabase/schema.sql`

### 4. Crear el primer usuario

1. Ve a **Supabase** → **Authentication** → **Users** → **Add user**
2. Introduce tu email y contraseña
3. Entra en la app con esas credenciales

### 5. Arrancar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Despliegue en Vercel

1. Conecta el repositorio de GitHub en Vercel
2. Añade las variables de entorno en Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
3. Despliega

## Estructura del proyecto

```
app/
  (app)/                    # Rutas protegidas (requieren auth)
    clientes/
      page.tsx              # Lista de clientes
      nuevo/page.tsx        # Alta de cliente
      [id]/
        page.tsx            # Ficha cliente
        subir/page.tsx      # Subida de PDF
        validar/[vid]/      # Validación de extracción
        [ramo]/page.tsx     # Pantalla de ramo
  api/
    upload/route.ts         # API: subida + extracción Claude
  login/page.tsx            # Login
components/
  layout/Sidebar.tsx
lib/
  supabase/client.ts        # Cliente browser
  supabase/server.ts        # Cliente servidor
types/index.ts              # Tipos TypeScript + constantes
supabase/schema.sql         # Schema completo de BD
```

## Ramos soportados

- Daños / Property
- RC General
- RC D&O
- Cyber
- Transporte de Mercancías
- Crédito

## Roadmap

- [x] Fase 1: Core — Auth, clientes, subida PDF, extracción IA, validación
- [ ] Fase 2: Pantallas de ramo con edición completa
- [ ] Fase 3: Exportación PDF y Excel
- [ ] Fase 4: Mapa de riesgos interactivo
- [ ] Fase 5: Multi-usuario (socios ABK)
