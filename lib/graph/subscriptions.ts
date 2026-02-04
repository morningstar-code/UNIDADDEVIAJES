import { getGraphClient } from './client'

const MS_SHARED_MAILBOX = process.env.MS_SHARED_MAILBOX!
const MS_INTAKE_FOLDER_NAME = process.env.MS_INTAKE_FOLDER_NAME || 'Intake'
const APP_BASE_URL = process.env.APP_BASE_URL!
const MS_WEBHOOK_SECRET = process.env.MS_WEBHOOK_SECRET!

export interface Subscription {
  id?: string
  changeType: string
  notificationUrl: string
  resource: string
  expirationDateTime: string
  clientState: string
}

export async function createSubscription(): Promise<Subscription> {
  const client = await getGraphClient()
  
  // First, get the mailbox folder ID
  const mailbox = await client
    .api(`/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/mailFolders`)
    .filter(`displayName eq '${MS_INTAKE_FOLDER_NAME}'`)
    .get()

  if (!mailbox.value || mailbox.value.length === 0) {
    throw new Error(`Folder '${MS_INTAKE_FOLDER_NAME}' not found in mailbox ${MS_SHARED_MAILBOX}`)
  }

  const folderId = mailbox.value[0].id
  const resource = `/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/mailFolders/${folderId}/messages`

  const expirationDateTime = new Date()
  expirationDateTime.setDate(expirationDateTime.getDate() + 3) // 3 days

  const subscription: Subscription = {
    changeType: 'created',
    notificationUrl: `${APP_BASE_URL}/api/intake/webhook`,
    resource,
    expirationDateTime: expirationDateTime.toISOString(),
    clientState: MS_WEBHOOK_SECRET,
  }

  const result = await client.api('/subscriptions').post(subscription)
  return result
}

export async function renewSubscription(subscriptionId: string): Promise<Subscription> {
  const client = await getGraphClient()
  
  const expirationDateTime = new Date()
  expirationDateTime.setDate(expirationDateTime.getDate() + 3)

  const result = await client
    .api(`/subscriptions/${subscriptionId}`)
    .patch({
      expirationDateTime: expirationDateTime.toISOString(),
    })

  return result
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const client = await getGraphClient()
  const result = await client.api('/subscriptions').get()
  return result.value || []
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const client = await getGraphClient()
  await client.api(`/subscriptions/${subscriptionId}`).delete()
}
