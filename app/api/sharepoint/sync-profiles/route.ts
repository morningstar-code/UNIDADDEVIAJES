import { NextRequest, NextResponse } from 'next/server'
import { DocumentRequirementStatus, DocumentSource, ExternalDocumentStatus, NotificationType } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import {
  downloadSharePointFile,
  isBaseDocumentType,
  listDocumentsInPersonFolder,
  listPersonFolders,
  personNameFromSharePointFolder,
  resolveSharePointConfig,
  sharePointItemToMetadata,
  SharePointPermissionError,
} from '@/lib/graph/sharepoint'

export const runtime = 'nodejs'
export const maxDuration = 300

function normalizeName(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function findOrCreateProfileFromFolder(folderName: string) {
  const fullName = personNameFromSharePointFolder(folderName)
  const normalized = normalizeName(fullName)
  const candidates = await prisma.profile.findMany({
    where: { fullName: { not: null } },
    select: { id: true, fullName: true },
    take: 500,
  })
  const match = candidates.find((profile) => normalizeName(profile.fullName) === normalized)
  if (match) return { profileId: match.id, created: false, fullName }

  const profile = await prisma.profile.create({
    data: {
      fullName,
      sharePointFolderName: folderName,
      isIncompleteFromSharePoint: true,
    },
  })
  return { profileId: profile.id, created: true, fullName }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'sharepoint:sync')
  if (!user) return response!

  const summary = {
    profilesFound: 0,
    profilesCreated: 0,
    documentsAssociated: 0,
    documentsIgnored: 0,
    errors: [] as string[],
    unrecognizedFolders: [] as string[],
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.userId,
      action: 'SHAREPOINT_SYNC_STARTED',
      details: { storageMode: process.env.SHAREPOINT_STORAGE_MODE || 'metadata-only' },
    },
  })

  try {
    const config = await resolveSharePointConfig()
    const existingConfig = await prisma.sharePointSyncConfig.findFirst()
    await prisma.sharePointSyncConfig.upsert({
      where: { id: existingConfig?.id || '00000000-0000-0000-0000-000000000000' },
      update: {
        siteId: config.siteId,
        driveId: config.driveId,
        baseFolderId: config.baseFolderId,
        baseFolderName: config.baseFolderName,
        lastSyncAt: new Date(),
      },
      create: {
        siteId: config.siteId,
        driveId: config.driveId,
        baseFolderId: config.baseFolderId,
        baseFolderName: config.baseFolderName,
        lastSyncAt: new Date(),
      },
    })

    const mirrorToBlob = (process.env.SHAREPOINT_STORAGE_MODE || 'metadata-only').toLowerCase() === 'mirror-to-blob'
    const folders = await listPersonFolders(config)

    for (const folder of folders) {
      try {
        const personName = personNameFromSharePointFolder(folder.name)
        if (!personName || personName.length < 3) {
          summary.unrecognizedFolders.push(folder.name)
          continue
        }

        const profileResult = await findOrCreateProfileFromFolder(folder.name)
        if (profileResult.created) {
          summary.profilesCreated += 1
          await prisma.auditLog.create({
            data: {
              actorUserId: user.userId,
              profileId: profileResult.profileId,
              action: 'PROFILE_CREATED_FROM_SHAREPOINT',
              details: { folderName: folder.name, fullName: profileResult.fullName },
            },
          })
        } else {
          summary.profilesFound += 1
        }

        await prisma.profile.update({
          where: { id: profileResult.profileId },
          data: {
            sharePointFolderId: folder.id,
            sharePointFolderName: folder.name,
            sharePointLastSyncedAt: new Date(),
          },
        })

        const files = await listDocumentsInPersonFolder(config, folder.id)
        for (const file of files) {
          const metadata = sharePointItemToMetadata(config, file, folder)
          if (!isBaseDocumentType(metadata.documentType)) {
            summary.documentsIgnored += 1
          }

          const external = await prisma.profileExternalDocument.upsert({
            where: {
              sharePointDriveId_sharePointItemId: {
                sharePointDriveId: metadata.sharePointDriveId,
                sharePointItemId: metadata.sharePointItemId,
              },
            },
            update: {
              profileId: profileResult.profileId,
              ...metadata,
              status: ExternalDocumentStatus.ACTIVE,
              syncedAt: new Date(),
            },
            create: {
              profileId: profileResult.profileId,
              ...metadata,
              status: ExternalDocumentStatus.ACTIVE,
            },
          })

          let copiedDocumentId = external.copiedDocumentId
          if (mirrorToBlob && isBaseDocumentType(metadata.documentType) && !copiedDocumentId) {
            const buffer = await downloadSharePointFile(config.driveId, file.id)
            const upload = await uploadAttachmentToBlob({
              profileId: profileResult.profileId,
              originalFilename: file.name,
              buffer,
              contentType: metadata.mimeType,
              docType: metadata.documentType,
            })
            const document = await prisma.document.create({
              data: {
                profileId: profileResult.profileId,
                docType: metadata.documentType,
                originalFilename: file.name,
                mimeType: metadata.mimeType,
                sizeBytes: buffer.length,
                blobUrl: upload.blobUrl,
                blobPathname: upload.blobPathname,
                checksumSha256: upload.checksumSha256,
                status: DocumentRequirementStatus.UPLOADED,
                source: DocumentSource.SHAREPOINT,
                sharePointDriveId: config.driveId,
                sharePointItemId: file.id,
                sharePointWebUrl: file.webUrl,
                sharePointLastModified: metadata.sharePointLastModified,
                uploadedByUserId: user.userId,
                uploadedByName: user.email,
              },
            })
            copiedDocumentId = document.id
            await prisma.profileExternalDocument.update({
              where: { id: external.id },
              data: { copiedDocumentId },
            })
          }

          summary.documentsAssociated += 1
          await prisma.auditLog.create({
            data: {
              actorUserId: user.userId,
              profileId: profileResult.profileId,
              action: copiedDocumentId ? 'PROFILE_DOCUMENT_UPDATED' : 'PROFILE_DOCUMENT_LINKED',
              details: {
                externalDocumentId: external.id,
                copiedDocumentId,
                documentType: metadata.documentType,
                fileName: file.name,
                source: 'SHAREPOINT',
              },
            },
          })
        }
      } catch (error) {
        summary.errors.push(`${folder.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        action: summary.errors.length ? 'SHAREPOINT_SYNC_FAILED' : 'SHAREPOINT_SYNC_COMPLETED',
        details: summary,
      },
    })

    if (summary.errors.length > 0) {
      await prisma.notification.create({
        data: {
          type: NotificationType.SHAREPOINT_SYNC_ERRORS,
          title: 'Sincronizacion SharePoint con errores',
          message: `La sincronizacion termino con ${summary.errors.length} error(es).`,
        },
      })
    }

    return NextResponse.json({ success: summary.errors.length === 0, config, summary })
  } catch (error) {
    const message =
      error instanceof SharePointPermissionError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Error sincronizando SharePoint'

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        action: 'SHAREPOINT_SYNC_FAILED',
        details: { error: message },
      },
    })

    return NextResponse.json({ error: message, summary }, { status: error instanceof SharePointPermissionError ? 403 : 500 })
  }
}
