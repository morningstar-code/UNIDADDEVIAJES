import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { normalizeEmail } from '@/lib/intake/parser'

export async function POST(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'profiles:update')
  if (!user) {
    return response!
  }

  try {
    const data = await request.json()
    const { primaryEmail, ...profileData } = data

    if (!primaryEmail) {
      return NextResponse.json({ error: 'primaryEmail is required' }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(primaryEmail)

    const profile = await prisma.profile.upsert({
      where: { primaryEmail: normalizedEmail },
      update: {
        fullName: profileData.fullName || undefined,
        cedula: profileData.cedula || undefined,
        passportNumber: profileData.passportNumber || undefined,
        passportCountry: profileData.passportCountry || undefined,
        phone: profileData.phone || undefined,
        cargo: profileData.cargo || undefined,
        departamento: profileData.departamento || undefined,
      },
      create: {
        primaryEmail: normalizedEmail,
        fullName: profileData.fullName,
        cedula: profileData.cedula,
        passportNumber: profileData.passportNumber,
        passportCountry: profileData.passportCountry,
        phone: profileData.phone,
        cargo: profileData.cargo,
        departamento: profileData.departamento,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        profileId: profile.id,
        action: 'PROFILE_UPSERTED',
        details: { source: 'MANUAL', data: profileData },
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile upsert error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
