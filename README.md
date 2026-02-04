# INDOTEL - Sistema de Automatización de Viajes

Sistema web para automatizar la Unidad de Viajes del departamento de Relaciones Internacionales de INDOTEL. El sistema procesa automáticamente emails con documentos, crea/actualiza perfiles de solicitantes, genera expedientes de viaje y gestiona el workflow de aprobación por etapas.

## Stack Tecnológico

- **Framework**: Next.js 14+ (App Router) con TypeScript
- **Base de Datos**: PostgreSQL en Neon
- **ORM**: Prisma
- **Storage**: Vercel Blob
- **Autenticación**: JWT con credenciales en DB
- **Integración Email**: Microsoft Graph API (Change Notifications)
- **Deploy**: Vercel

## Requisitos Previos

1. Cuenta en [Neon](https://neon.tech) para PostgreSQL
2. Cuenta en [Vercel](https://vercel.com) para deploy y Blob Storage
3. Aplicación registrada en Azure Entra ID (Microsoft Graph)
4. Node.js 18+ y npm/yarn

## Configuración Inicial

### 1. Clonar y Instalar Dependencias

```bash
git clone <repository-url>
cd proyecto-viajes-indotel-automatiacion
npm install
```

### 2. Configurar Base de Datos (Neon)

1. Crear una base de datos en Neon
2. Obtener las URLs de conexión:
   - **DATABASE_URL**: URL pooled (para la aplicación)
   - **DIRECT_URL**: URL direct (para migrations)

### 3. Configurar Vercel Blob

1. En tu proyecto de Vercel, ve a Storage → Blob
2. Crea un nuevo Blob Store
3. Copia el token `BLOB_READ_WRITE_TOKEN`

### 4. Registrar Aplicación en Azure Entra ID

1. Ve a [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Crea una nueva aplicación
3. Anota:
   - **Tenant ID** (Directory ID)
   - **Application (client) ID**
   - **Client secret** (crea uno en "Certificates & secrets")
4. Configura permisos API:
   - Microsoft Graph → Application permissions:
     - `Mail.Read` (para leer emails)
     - `Mail.ReadWrite` (para leer y escribir)
     - `MailboxSettings.Read` (opcional)
5. **Admin consent**: Otorga consentimiento de administrador para los permisos

### 5. Configurar Variables de Entorno

Crea un archivo `.env` basado en `env.example`:

```bash
cp env.example .env
```

Edita `.env` con tus valores:

```env
# Database (Neon)
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"
APP_BASE_URL="https://tuapp.vercel.app"

# Microsoft Graph / Entra ID
MS_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MS_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MS_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
MS_SHARED_MAILBOX="unidaddeviajes@indotel.gob.do"
MS_INTAKE_FOLDER_NAME="Intake"
MS_WEBHOOK_SECRET="your-secret-webhook-key-here"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
ADMIN_SEED_EMAIL="admin@indotel.gob.do"
ADMIN_SEED_PASSWORD="ChangeThisPassword123!"
```

### 6. Configurar Base de Datos

```bash
# Generar Prisma Client
npm run db:generate

# Ejecutar migrations
npm run db:migrate

# Seed inicial (roles y usuario admin)
npm run db:seed
```

### 7. Preparar Buzón de Correo

1. Asegúrate de que el buzón compartido `unidaddeviajes@indotel.gob.do` existe
2. Crea una carpeta llamada `Intake` (o el nombre que especifiques en `MS_INTAKE_FOLDER_NAME`)
3. Los emails con documentos deben llegar a esta carpeta

## Desarrollo Local

### Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Probar Webhook Localmente (ngrok)

Para probar el webhook de Microsoft Graph localmente:

1. Instala [ngrok](https://ngrok.com/)
2. Ejecuta ngrok:
   ```bash
   ngrok http 3000
   ```
3. Copia la URL HTTPS (ej: `https://abc123.ngrok.io`)
4. Actualiza `APP_BASE_URL` en `.env` con la URL de ngrok
5. Crea la subscription (ver siguiente sección)

## Crear Subscription de Microsoft Graph

Una vez que la aplicación esté desplegada (o usando ngrok):

1. Inicia sesión en la aplicación como admin
2. Ejecuta el endpoint para crear la subscription:
   ```bash
   curl -X POST https://tuapp.vercel.app/api/intake/subscription/create \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```
   O desde la UI, puedes crear un script o usar Postman.

3. La subscription expira en 3 días. Configura un cron job para renovarla:
   - Vercel Cron: Crea `vercel.json` con configuración de cron
   - O usa un servicio externo como cron-job.org que llame a `/api/intake/subscription/renew`

### Ejemplo de vercel.json para Cron

```json
{
  "crons": [
    {
      "path": "/api/intake/subscription/renew",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Estructura del Proyecto

```
.
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Autenticación
│   │   ├── profiles/      # Gestión de perfiles
│   │   ├── cases/         # Gestión de casos
│   │   ├── tasks/         # Gestión de tareas
│   │   └── intake/        # Webhook y subscriptions
│   ├── dashboard/         # Páginas del dashboard
│   ├── login/             # Página de login
│   └── layout.tsx         # Layout principal
├── lib/
│   ├── db/                # Prisma client
│   ├── auth/              # JWT y password hashing
│   ├── graph/             # Microsoft Graph client
│   ├── blob/              # Vercel Blob upload
│   ├── intake/            # Parser y processor de emails
│   ├── workflow/          # Lógica de workflow
│   └── middleware/        # Middleware de autenticación
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   └── seed.ts            # Script de seed
└── package.json
```

## Flujo de Trabajo

### Procesamiento Automático de Emails

1. Email llega a la carpeta `Intake` del buzón compartido
2. Microsoft Graph envía notificación al webhook `/api/intake/webhook`
3. El sistema:
   - Extrae información del email (parser)
   - Busca/crea perfil por email (normalizado)
   - Crea o actualiza caso de viaje
   - Descarga y clasifica documentos
   - Sube documentos a Vercel Blob
   - Crea primera tarea en el workflow
   - Registra en AuditLog

### Workflow de Aprobación

1. **DOCS_VALIDATION** → VIAJES_ANALISTA
2. **TECH_REVIEW** → VIAJES_ANALISTA
3. **MANAGER_APPROVAL** → JEFE
4. **FINANCE_APPROVAL** → FINANZAS
5. **HR_APPROVAL** → RRHH
6. **APPROVED** → Caso aprobado

Cada paso puede:
- **Aprobar**: Avanza al siguiente paso
- **Rechazar**: Marca el caso como REJECTED
- **Solicitar Info**: Vuelve a DOCS_VALIDATION con status NEEDS_INFO

## Roles y Permisos

- **ADMIN**: Acceso completo
- **VIAJES_ANALISTA**: Crear/editar casos, aprobar tareas iniciales
- **JEFE**: Aprobar en paso MANAGER_APPROVAL
- **FINANZAS**: Aprobar en paso FINANCE_APPROVAL
- **RRHH**: Aprobar en paso HR_APPROVAL

## Clasificación de Documentos

El sistema clasifica automáticamente los documentos por nombre y tipo MIME:

- **CEDULA**: cédula, identificación, DNI
- **PASAPORTE**: pasaporte, passport
- **FOTO**: foto, photo, imagen
- **CARTA_INVITACION**: invitación, invitation, carta
- **AGENDA**: agenda, schedule, programa
- **TICKET**: ticket, boleto, vuelo, reserva
- **OTRO**: cualquier otro documento

Los documentos base (cédula, pasaporte, foto) se asocian al perfil. Los documentos del viaje (agenda, invitación, tickets) se asocian al caso.

## Parser de Emails

El parser extrae información del subject y body del email usando regex:

- Email del solicitante
- Nombre completo
- Cédula
- Pasaporte y país
- Teléfono
- Destino (país y ciudad)
- Fechas de salida/retorno
- Motivo y evento
- Institución organizadora
- Monto estimado y moneda
- CASE_ID (si se especifica para actualizar caso existente)

## Endpoints API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/me` - Obtener usuario actual

### Perfiles
- `POST /api/profiles/upsert` - Crear/actualizar perfil
- `GET /api/profiles/search?q=...` - Buscar perfiles
- `GET /api/profiles/[id]` - Obtener perfil con casos y documentos

### Casos
- `POST /api/cases` - Crear caso manualmente
- `GET /api/cases/[id]` - Obtener caso con detalles

### Tareas
- `GET /api/tasks/my` - Obtener tareas pendientes del usuario
- `POST /api/tasks/[id]/action` - Aprobar/rechazar/solicitar info

### Intake
- `POST /api/intake/webhook` - Webhook de Microsoft Graph
- `POST /api/intake/subscription/create` - Crear subscription (admin)
- `POST /api/intake/subscription/renew` - Renovar subscriptions (admin/cron)

## Testing

Ejecuta tests mínimos:

```bash
# Tests unitarios del parser y classifier
npm test
```

## Deploy a Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel Dashboard
3. Vercel detectará Next.js automáticamente
4. Ejecuta migrations después del deploy:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Seguridad

- **JWT_SECRET**: Usa un secreto fuerte en producción
- **MS_CLIENT_SECRET**: En producción, considera usar certificados en lugar de secrets
- **MS_WEBHOOK_SECRET**: Valida todas las notificaciones
- **HTTPS**: Siempre usa HTTPS en producción
- **Rate Limiting**: Considera agregar rate limiting a los endpoints públicos

## Troubleshooting

### El webhook no recibe notificaciones

1. Verifica que la subscription esté activa: `GET /api/intake/subscription/list`
2. Verifica que `APP_BASE_URL` sea accesible públicamente
3. Revisa los logs de Vercel
4. Verifica que la carpeta `Intake` exista en el buzón

### Los documentos no se suben

1. Verifica `BLOB_READ_WRITE_TOKEN`
2. Revisa los logs del procesador
3. Verifica permisos de Vercel Blob

### Error de autenticación con Microsoft Graph

1. Verifica `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`
2. Verifica que los permisos estén otorgados (Admin consent)
3. Revisa los logs de autenticación

## Licencia

[Especificar licencia]

## Contacto

[Información de contacto]
