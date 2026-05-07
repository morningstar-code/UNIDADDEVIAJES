import { getGraphClient } from './client'

const MS_SHARED_MAILBOX = process.env.MS_SHARED_MAILBOX!

export interface SendMailParams {
  to: string
  subject: string
  htmlBody: string
  attachments?: Array<{
    filename: string
    contentType: string
    content: Buffer
  }>
}

export async function sendMail({ to, subject, htmlBody, attachments = [] }: SendMailParams) {
  const client = await getGraphClient()
  await client.api(`/users/${encodeURIComponent(MS_SHARED_MAILBOX)}/sendMail`).post({
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
      attachments: attachments.map((attachment) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType,
        contentBytes: attachment.content.toString('base64'),
      })),
    },
    saveToSentItems: true,
  })
}
