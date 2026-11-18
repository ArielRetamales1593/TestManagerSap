# UAT Test Manager - SAP Governance (MVP Completo)

Plataforma web *Clean Core / Side-by-Side* para gobernar y ejecutar pruebas UAT en entornos SAP, construida con **Next.js 14 (App Router), TypeScript, Tailwind CSS y Prisma ORM (PostgreSQL)**.

---

## Estructura Completa del Proyecto

```text
uat-test-manager-mvp-v2/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── .env.example
├── prisma/
│   ├── schema.prisma                  # Las 5 tablas del modelo de gobernanza UAT
│   └── seed.ts                        # Datos iniciales de prueba (QA Lead, Key Users y HU MM)
├── lib/
│   ├── prisma.ts                      # Cliente singleton de Prisma
│   └── services/
│       ├── testCaseService.ts         # Lógica modular + Hook preparado para futura IA
│       └── metricsService.ts          # Consultas agregadas para futuro Dashboard de KPIs
└── app/
    ├── globals.css
    ├── layout.tsx                     # Barra de navegación con las 4 etapas
    ├── page.tsx                       # Portal de inicio del flujo UAT
    ├── api/
    │   ├── stories/route.ts           # GET y POST de Historias de Usuario
    │   ├── test-cases/route.ts        # GET y POST de Casos (nacen en DRAFT)
    │   ├── governance/route.ts        # PATCH del Quality Gate (Approve/Reject/Edit)
    │   ├── test-plans/route.ts        # GET y POST de Planes con asignación híbrida
    │   └── execution/route.ts         # PATCH de ejecución del Key User (PASSED/FAILED)
    ├── admin/
    │   ├── stories/page.tsx           # Etapa 1: Formulario de HU + Diseño de Casos en DRAFT
    │   ├── governance/page.tsx        # Etapa 2: Bandeja de Gobernanza del QA Lead
    │   └── plans/page.tsx             # Etapa 3: Constructor de Planes y Asignación Híbrida
    └── key-user/
        └── execution/page.tsx         # Etapa 4: Bandeja de Tarjetas del Key User
```

---

## Pasos para Levantar el Proyecto en Local

1. **Descomprimir el archivo ZIP** y abrir la carpeta en **VS Code**:
   ```bash
   cd uat-test-manager-mvp-v2
   ```

2. **Instalar las dependencias**:
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno**:
   Duplica el archivo `.env.example`, renómbralo a `.env` y coloca tu cadena de conexión a PostgreSQL (puede ser local o en Neon.tech):
   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/uat_test_manager?schema=public"
   ```

4. **Sincronizar las tablas con PostgreSQL y poblar semillas**:
   ```bash
   npx prisma db push
   npx prisma generate
   npm run db:seed
   ```

5. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre `http://localhost:3000` en tu navegador.
   *(Nota: Las vistas incluyen estado interactivo pre-cargado para que puedas probar y navegar por las 4 etapas inmediatamente en el navegador incluso antes de conectar PostgreSQL).*
