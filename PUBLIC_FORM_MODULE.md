# Módulo Público de Solicitudes de Viaje

## Resumen

Se ha implementado un módulo completo para que personas externas puedan solicitar viajes a través de un formulario público sin necesidad de login.

## Funcionalidades Implementadas

### 1. Página Pública de Solicitud (`/solicitar`)

- **Formulario multi-paso** con 4 secciones:
  1. **Datos Personales**: nombre, apellido, email, cédula, teléfono, departamento, cargo
  2. **Datos del Viaje**: país/ciudad destino, fechas, institución organizadora, evento, motivo
  3. **Datos Administrativos**: monto, moneda, centro de costo, observaciones
  4. **Documentos**: upload múltiple con clasificación por tipo

- **Validaciones**:
  - Email válido
  - Fechas válidas (retorno >= salida)
  - Campos requeridos
  - Tamaño máximo de archivos

- **UI/UX**:
  - Barra de progreso
  - Navegación entre pasos
  - Preview de documentos antes de enviar
  - Clasificación de documentos por tipo

### 2. Página de Confirmación (`/solicitar/success`)

- Muestra número de solicitud (TRV-XXXX)
- Mensaje de confirmación
- Próximos pasos
- Link para nueva solicitud

### 3. Backend - API Route (`/api/public/submit-request`)

**Funcionalidades**:
- **Upsert de Perfil**: No duplica perfiles
  - Prioridad 1: Buscar por cédula (si existe)
  - Prioridad 2: Buscar por email (si no hay cédula)
  - Si no existe, crear nuevo perfil
  - Maneja conflictos (cédula vs email en perfiles diferentes)

- **Creación de Case**:
  - Status inicial: `RECEIVED`
  - Source: `PUBLIC_FORM`
  - Crea primera tarea asignada a `VIAJES_ANALISTA`

- **Upload de Documentos**:
  - Sube a Vercel Blob
  - Documentos base (cédula/pasaporte) → asociados al perfil
  - Documentos de viaje → asociados al case
  - Calcula checksum SHA256

- **Idempotencia**:
  - Usa `clientGeneratedId` para prevenir duplicados
  - Si se envía dos veces la misma solicitud, retorna la existente

### 4. Dashboard Admin

- **Card "Nueva Solicitud (Link Público)"**:
  - Muestra el link público
  - Botón para copiar al portapapeles
  - Botón para abrir en nueva pestaña

### 5. Vista de Perfiles

- Ya existente, muestra:
  - Documentos base del perfil
  - Historial completo de viajes (cases)
  - Cada viaje muestra estado, fechas, destino

## Cambios en Base de Datos

### Schema Updates

1. **CaseSource enum**: `PUBLIC_FORM` agregado
2. **DocumentType enum**: `MEMO_APROBACION` agregado
3. **Profile**:
   - `primaryEmail`: ahora nullable
   - `cedula`: unique cuando no es null
4. **Case**:
   - `centroCosto`: String?
   - `observaciones`: Text?
   - `clientGeneratedId`: String? unique (idempotencia)

## Archivos Creados

- `app/solicitar/page.tsx` - Formulario público
- `app/solicitar/success/page.tsx` - Página de confirmación
- `app/api/public/submit-request/route.ts` - API endpoint
- `lib/public/upsert-profile.ts` - Lógica de upsert de perfiles
- `MIGRATION_PUBLIC_FORM.md` - Guía de migración

## Archivos Modificados

- `prisma/schema.prisma` - Schema actualizado
- `app/dashboard/page.tsx` - Agregado card de link público
- `package.json` - Agregado uuid (aunque se usa crypto.randomUUID)

## Próximos Pasos

1. **Ejecutar migración**:
   ```bash
   npx prisma db push
   # o
   npx prisma migrate dev --name add_public_form_module
   ```

2. **Probar el flujo completo**:
   - Acceder a `/solicitar`
   - Llenar formulario completo
   - Subir documentos
   - Verificar que se crea perfil y case
   - Verificar en admin que aparece en "Mi Bandeja"

3. **Opcional - Mejoras futuras**:
   - Generar links únicos con tokens para tracking
   - Agregar validación de tamaño de archivos en frontend
   - Agregar preview de imágenes antes de subir
   - Agregar notificaciones por email

## Casos de Prueba

### Caso A: Persona nueva con cédula
- Submit → crea profile + crea request + docs en Blob + se ve en admin ✅

### Caso B: Misma persona vuelve a solicitar
- Submit → NO crea profile nuevo; crea travel_request nuevo; historial muestra ambos viajes ✅

### Caso C: Persona sin cédula pero con email
- Upsert por email ✅

### Caso D: Upload de múltiples anexos
- Todos quedan en documents y se pueden abrir/descargar desde admin ✅

## Notas Técnicas

- El formulario usa `clientGeneratedId` para idempotencia
- Los documentos se suben como base64 y se convierten a Buffer en el servidor
- El sistema maneja conflictos entre cédula y email en perfiles diferentes
- La página de success es server-side para evitar problemas de prerender
