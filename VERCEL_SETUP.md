# GUÍA RÁPIDA PARA RESOLVER 404 EN VERCEL

## El problema
El deployment se completa pero obtienes 404. Esto generalmente es por:
1. Variables de entorno no configuradas
2. Accediendo a la URL incorrecta

## SOLUCIÓN PASO A PASO

### 1. Configura TODAS las variables de entorno en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables

**AGREGA ESTAS VARIABLES (todas son requeridas):**

```
DATABASE_URL=postgresql://neondb_owner:npg_WFbAK13crQwm@ep-orange-union-aiv7xg2i-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require

DIRECT_URL=postgresql://neondb_owner:npg_WFbAK13crQwm@ep-orange-union-aiv7xg2i.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require

BLOB_READ_WRITE_TOKEN=vercel_blob_rw_Cuw5ivwrgpvFpb9e_QkRdSrl8c2F8fT4WZTUoGZXgAdN3FM

APP_BASE_URL=https://unidaddeviajes.vercel.app

JWT_SECRET=super-secret-jwt-key-change-this-in-production-12345678

ADMIN_SEED_EMAIL=admin@indotel.gob.do

ADMIN_SEED_PASSWORD=ChangeThisPassword123!

MS_TENANT_ID=00000000-0000-0000-0000-000000000000
MS_CLIENT_ID=00000000-0000-0000-0000-000000000000
MS_CLIENT_SECRET=placeholder-change-later
MS_SHARED_MAILBOX=unidaddeviajes@indotel.gob.do
MS_INTAKE_FOLDER_NAME=Intake
MS_WEBHOOK_SECRET=webhook-secret-key-12345
```

**IMPORTANTE:** Configura todas para Production, Preview y Development.

### 2. Redeploy después de configurar variables

Después de agregar las variables:
1. Ve a Deployments
2. Encuentra el último deployment
3. Click en los 3 puntos (...)
4. Click "Redeploy"
5. Marca "Use existing Build Cache"

### 3. Accede a las rutas correctas

**NO accedas a:**
- `https://unidaddeviajes-XXXX.vercel.app` (deployment preview)

**ACCEDE A:**
- `https://unidaddeviajes.vercel.app/login` (URL de producción + /login)

O usa el dominio principal que aparece en la lista de dominios.

### 4. Verificar logs

Si sigue fallando:
1. Ve a Deployment → Runtime Logs
2. Busca el error específico
3. El error te dirá qué variable falta o qué está mal

### 5. Rutas disponibles

Estas rutas deberían funcionar:
- `/login` - Página de login
- `/dashboard` - Dashboard (requiere login)
- `/api/auth/login` - Endpoint de login

## SOLUCIÓN RÁPIDA

Si nada funciona:
1. Asegúrate de que TODAS las variables de entorno estén configuradas
2. Accede directamente a `/login`: `https://unidaddeviajes.vercel.app/login`
3. NO accedas a la URL preview, usa el dominio principal
