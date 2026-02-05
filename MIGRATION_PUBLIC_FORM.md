# Migración: Módulo Público de Solicitudes

## Cambios en el Schema

1. **CaseSource enum**: Agregado `PUBLIC_FORM`
2. **DocumentType enum**: Agregado `MEMO_APROBACION`
3. **Profile model**: 
   - `primaryEmail` ahora es nullable (para soportar perfiles solo con cédula)
   - `cedula` ahora es unique cuando no es null
4. **Case model**: 
   - Agregado `centroCosto` (String?)
   - Agregado `observaciones` (Text?)
   - Agregado `clientGeneratedId` (String? unique) para idempotencia

## Ejecutar Migración

```bash
# Opción 1: Usar db push (recomendado para desarrollo)
npx prisma db push

# Opción 2: Crear migración formal
npx prisma migrate dev --name add_public_form_module
```

## Verificar Cambios

Después de la migración, verifica que:
- Los nuevos campos existen en la tabla `Case`
- El índice único en `cedula` está creado
- El índice único en `clientGeneratedId` está creado

## Notas

- Si hay perfiles existentes sin email, necesitarás actualizarlos manualmente o permitir null en `primaryEmail`
- El sistema ahora soporta perfiles identificados solo por cédula o solo por email
