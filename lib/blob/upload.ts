import { put } from '@vercel/blob'
import crypto from 'crypto'

export interface UploadAttachmentParams {
  profileId?: string
  caseId?: string
  originalFilename: string
  buffer: Buffer
  contentType: string
  docType: string
}

export interface UploadResult {
  blobUrl: string
  blobPathname: string
  checksumSha256: string
}

export async function uploadAttachmentToBlob(
  params: UploadAttachmentParams
): Promise<UploadResult> {
  const { profileId, caseId, originalFilename, buffer, contentType, docType } = params

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set')
  }

  // Calculate checksum
  const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex')

  // Sanitize filename
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()
  const filename = `${timestamp}-${sanitizedFilename}`

  // Build pathname
  let pathname: string
  if (caseId && profileId) {
    // Case-specific document
    pathname = `profiles/${profileId}/cases/${caseId}/${docType}/${filename}`
  } else if (profileId) {
    // Base profile document
    pathname = `profiles/${profileId}/base/${docType}/${filename}`
  } else {
    throw new Error('Either profileId or caseId must be provided')
  }

  // Upload to Vercel Blob
  // Convert Buffer to Blob for Vercel Blob API
  const blobData = new Blob([new Uint8Array(buffer)], { type: contentType })
  const blob = await put(pathname, blobData, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return {
    blobUrl: blob.url,
    blobPathname: blob.pathname,
    checksumSha256,
  }
}
