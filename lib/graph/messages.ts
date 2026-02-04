import { getGraphClient } from './client'

const MS_SHARED_MAILBOX = process.env.MS_SHARED_MAILBOX!
const MS_INTAKE_FOLDER_NAME = process.env.MS_INTAKE_FOLDER_NAME || 'Intake'

export interface GraphMessage {
  id: string
  internetMessageId: string
  subject: string
  body: {
    contentType: string
    content: string
  }
  from: {
    emailAddress: {
      address: string
      name?: string
    }
  }
  receivedDateTime: string
  hasAttachments: boolean
}

export interface GraphAttachment {
  id: string
  name: string
  contentType: string
  size: number
  contentBytes?: string
}

export async function getMessage(messageId: string): Promise<GraphMessage> {
  const client = await getGraphClient()
  const result = await client
    .api(`/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/messages/${messageId}`)
    .select('id,internetMessageId,subject,body,from,receivedDateTime,hasAttachments')
    .get()
  return result
}

export async function listMessagesSince(
  folderName: string = MS_INTAKE_FOLDER_NAME,
  sinceDateTime?: string
): Promise<GraphMessage[]> {
  const client = await getGraphClient()
  
  // Get folder ID
  const mailbox = await client
    .api(`/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/mailFolders`)
    .filter(`displayName eq '${folderName}'`)
    .get()

  if (!mailbox.value || mailbox.value.length === 0) {
    return []
  }

  const folderId = mailbox.value[0].id
  let url = `/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/mailFolders/${folderId}/messages`
  
  const params: string[] = []
  params.push('$select=id,internetMessageId,subject,body,from,receivedDateTime,hasAttachments')
  params.push('$orderby=receivedDateTime desc')
  params.push('$top=50')
  
  if (sinceDateTime) {
    params.push(`$filter=receivedDateTime ge ${sinceDateTime}`)
  }

  url += '?' + params.join('&')

  const result = await client.api(url).get()
  return result.value || []
}

export async function getAttachments(messageId: string): Promise<GraphAttachment[]> {
  const client = await getGraphClient()
  const result = await client
    .api(`/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/messages/${messageId}/attachments`)
    .get()
  return result.value || []
}

export async function downloadAttachment(
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const client = await getGraphClient()
  const attachment = await client
    .api(`/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/messages/${messageId}/attachments/${attachmentId}`)
    .get()

  if (!attachment.contentBytes) {
    throw new Error('Attachment has no contentBytes')
  }

  return Buffer.from(attachment.contentBytes, 'base64')
}
