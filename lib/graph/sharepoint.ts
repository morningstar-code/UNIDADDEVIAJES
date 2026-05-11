import { DocumentType } from '@prisma/client'
import { getGraphAccessToken, getGraphClient } from './client'

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

export interface SharePointDriveItem {
  id: string
  name: string
  size?: number
  webUrl?: string
  lastModifiedDateTime?: string
  file?: { mimeType?: string }
  folder?: { childCount?: number }
  parentReference?: {
    driveId?: string
    id?: string
    path?: string
  }
  lastModifiedBy?: {
    user?: {
      displayName?: string
      email?: string
    }
  }
}

export interface ResolvedSharePointConfig {
  siteId: string
  driveId: string
  baseFolderId: string
  baseFolderName: string
}

export class SharePointPermissionError extends Error {
  constructor(message = 'Faltan permisos de Microsoft Graph para leer SharePoint.') {
    super(message)
    this.name = 'SharePointPermissionError'
  }
}

function env(name: string) {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

function isGraphPermissionError(error: any) {
  const statusCode = error?.statusCode || error?.code
  const message = String(error?.message || error?.body || '')
  return statusCode === 401 || statusCode === 403 || /access denied|unauthorized|forbidden|insufficient/i.test(message)
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cleanFolderPersonName(folderName: string) {
  return folderName.replace(/^documentos\s*[-–—]\s*/i, '').trim()
}

export function personNameFromSharePointFolder(folderName: string) {
  return cleanFolderPersonName(folderName)
}

export function classifySharePointDocument(filename: string): DocumentType {
  const normalized = normalizeName(filename)
  if (/\bcedula\b|\bc[eé]dula\b/.test(normalized)) return DocumentType.CEDULA
  if (/\bpasaporte\b|\bpassport\b/.test(normalized)) return DocumentType.PASAPORTE
  if (/\bvisa\b/.test(normalized)) return DocumentType.VISA
  return DocumentType.OTRO
}

export function isBaseDocumentType(docType: DocumentType) {
  const baseTypes: DocumentType[] = [DocumentType.CEDULA, DocumentType.PASAPORTE, DocumentType.VISA]
  return baseTypes.includes(docType)
}

async function graphGet<T>(path: string): Promise<T> {
  const client = await getGraphClient()
  try {
    return await client.api(path).get()
  } catch (error: any) {
    if (isGraphPermissionError(error)) throw new SharePointPermissionError()
    throw error
  }
}

export async function resolveSharePointSiteId() {
  const configuredSiteId = env('SHAREPOINT_SITE_ID')
  if (configuredSiteId) return configuredSiteId

  const hostname = env('SHAREPOINT_SITE_HOSTNAME')
  const sitePath = env('SHAREPOINT_SITE_PATH')
  if (!hostname || !sitePath) {
    throw new Error('Faltan SHAREPOINT_SITE_HOSTNAME y SHAREPOINT_SITE_PATH o SHAREPOINT_SITE_ID')
  }

  const site = await graphGet<{ id: string }>(`/sites/${hostname}:${sitePath}`)
  return site.id
}

export async function resolveSharePointDriveId(siteId: string) {
  const configuredDriveId = env('SHAREPOINT_DRIVE_ID')
  if (configuredDriveId) return configuredDriveId

  const libraryName = env('SHAREPOINT_LIBRARY_NAME') || 'Documentos compartidos'
  const drives = await graphGet<{ value: Array<{ id: string; name: string }> }>(`/sites/${siteId}/drives`)
  const drive = drives.value.find((item) => normalizeName(item.name) === normalizeName(libraryName))
  if (!drive) throw new Error(`No se encontro la biblioteca SharePoint "${libraryName}"`)
  return drive.id
}

export async function resolveSharePointBaseFolder(driveId: string) {
  const configuredFolderId = env('SHAREPOINT_BASE_FOLDER_ID')
  const baseFolderName = env('SHAREPOINT_BASE_FOLDER') || 'PASAPORTES Y CEDULAS EJECUTIVOS'
  if (configuredFolderId) {
    const folder = await graphGet<SharePointDriveItem>(`/drives/${driveId}/items/${configuredFolderId}`)
    return { id: folder.id, name: folder.name || baseFolderName }
  }

  const encodedPath = baseFolderName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  const folder = await graphGet<SharePointDriveItem>(`/drives/${driveId}/root:/${encodedPath}`)
  return { id: folder.id, name: folder.name || baseFolderName }
}

export async function resolveSharePointConfig(): Promise<ResolvedSharePointConfig> {
  const siteId = await resolveSharePointSiteId()
  const driveId = await resolveSharePointDriveId(siteId)
  const baseFolder = await resolveSharePointBaseFolder(driveId)
  return {
    siteId,
    driveId,
    baseFolderId: baseFolder.id,
    baseFolderName: baseFolder.name,
  }
}

export async function listSharePointChildren(driveId: string, folderId: string) {
  const result = await graphGet<{ value: SharePointDriveItem[] }>(
    `/drives/${driveId}/items/${folderId}/children?$select=id,name,size,webUrl,lastModifiedDateTime,file,folder,parentReference,lastModifiedBy&$top=200`
  )
  return result.value || []
}

export async function listPersonFolders(config: ResolvedSharePointConfig) {
  const children = await listSharePointChildren(config.driveId, config.baseFolderId)
  return children.filter((item) => !!item.folder)
}

export async function listDocumentsInPersonFolder(config: ResolvedSharePointConfig, folderId: string) {
  const children = await listSharePointChildren(config.driveId, folderId)
  return children.filter((item) => !!item.file)
}

export async function downloadSharePointFile(driveId: string, itemId: string) {
  const token = await getGraphAccessToken()
  const response = await fetch(`${GRAPH_BASE_URL}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401 || response.status === 403) throw new SharePointPermissionError()
  if (!response.ok) throw new Error(`No se pudo descargar archivo SharePoint (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

export function sharePointItemToMetadata(config: ResolvedSharePointConfig, item: SharePointDriveItem, folder: SharePointDriveItem) {
  return {
    sharePointSiteId: config.siteId,
    sharePointDriveId: config.driveId,
    sharePointItemId: item.id,
    sharePointWebUrl: item.webUrl,
    sharePointLastModified: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : undefined,
    parentFolderId: folder.id,
    parentFolderName: folder.name,
    modifiedBy: item.lastModifiedBy?.user?.displayName || item.lastModifiedBy?.user?.email,
    originalFileName: item.name,
    mimeType: item.file?.mimeType || 'application/octet-stream',
    sizeBytes: item.size || 0,
    documentType: classifySharePointDocument(item.name),
  }
}
