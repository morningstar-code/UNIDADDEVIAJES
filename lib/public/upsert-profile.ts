import { prisma } from '@/lib/db/prisma'
import { normalizeEmail } from '@/lib/intake/parser'

export interface ProfileUpsertData {
  email?: string
  cedula?: string
  firstName?: string
  lastName?: string
  phone?: string
  departamento?: string
  cargo?: string
}

export interface UpsertProfileResult {
  profileId: string
  isNew: boolean
  conflict?: string
}

/**
 * Normalize cédula: remove dashes and spaces
 */
function normalizeCedula(cedula: string | undefined): string | undefined {
  if (!cedula) return undefined
  return cedula.replace(/[-\s]/g, '').trim()
}

/**
 * Upsert profile by cédula (priority) or email
 * Returns profile ID and whether it's new
 */
export async function upsertProfileByCedulaOrEmail(
  data: ProfileUpsertData
): Promise<UpsertProfileResult> {
  const normalizedCedula = normalizeCedula(data.cedula)
  const normalizedEmail = data.email ? normalizeEmail(data.email) : undefined

  // Priority 1: If cédula exists, use it
  if (normalizedCedula) {
    const existingByCedula = await prisma.profile.findUnique({
      where: { cedula: normalizedCedula },
    }).catch(() => null)

    if (existingByCedula) {
      // Update existing profile
      const fullName = data.firstName && data.lastName 
        ? `${data.firstName} ${data.lastName}`.trim()
        : data.firstName || data.lastName || existingByCedula.fullName

      const updated = await prisma.profile.update({
        where: { id: existingByCedula.id },
        data: {
          fullName: fullName || undefined,
          primaryEmail: normalizedEmail || existingByCedula.primaryEmail,
          phone: data.phone || existingByCedula.phone,
          departamento: data.departamento || existingByCedula.departamento,
          cargo: data.cargo || existingByCedula.cargo,
        },
      })

      // Check for conflict: if email was provided and it exists in another profile
      if (normalizedEmail && normalizedEmail !== existingByCedula.primaryEmail) {
        const existingByEmail = await prisma.profile.findUnique({
          where: { primaryEmail: normalizedEmail },
        }).catch(() => null)
        if (existingByEmail && existingByEmail.id !== existingByCedula.id) {
          return {
            profileId: updated.id,
            isNew: false,
            conflict: 'El email proporcionado pertenece a otro perfil. Se actualizó el perfil por cédula.',
          }
        }
      }

      return { profileId: updated.id, isNew: false }
    }
  }

  // Priority 2: If email exists, use it
  if (normalizedEmail) {
    const existingByEmail = await prisma.profile.findUnique({
      where: { primaryEmail: normalizedEmail },
    }).catch(() => null)

    if (existingByEmail) {
      // Update existing profile
      const fullName = data.firstName && data.lastName 
        ? `${data.firstName} ${data.lastName}`.trim()
        : data.firstName || data.lastName || existingByEmail.fullName

      const updated = await prisma.profile.update({
        where: { id: existingByEmail.id },
        data: {
          fullName: fullName || undefined,
          cedula: normalizedCedula || existingByEmail.cedula,
          phone: data.phone || existingByEmail.phone,
          departamento: data.departamento || existingByEmail.departamento,
          cargo: data.cargo || existingByEmail.cargo,
        },
      })

      // Check for conflict: if cédula was provided and it exists in another profile
      if (normalizedCedula && normalizedCedula !== existingByEmail.cedula) {
        const existingByCedula = await prisma.profile.findUnique({
          where: { cedula: normalizedCedula },
        }).catch(() => null)
        if (existingByCedula && existingByCedula.id !== existingByEmail.id) {
          return {
            profileId: updated.id,
            isNew: false,
            conflict: 'La cédula proporcionada pertenece a otro perfil. Se actualizó el perfil por email.',
          }
        }
      }

      return { profileId: updated.id, isNew: false }
    }
  }

  // Create new profile
  if (!normalizedCedula && !normalizedEmail) {
    throw new Error('Se requiere cédula o email para crear un perfil')
  }

  const fullName = data.firstName && data.lastName 
    ? `${data.firstName} ${data.lastName}`.trim()
    : data.firstName || data.lastName

  const newProfile = await prisma.profile.create({
    data: {
      primaryEmail: normalizedEmail,
      cedula: normalizedCedula,
      fullName: fullName || undefined,
      phone: data.phone,
      departamento: data.departamento,
      cargo: data.cargo,
    },
  })

  return { profileId: newProfile.id, isNew: true }
}
