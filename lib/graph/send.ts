import { getGraphClient } from './client'

const MS_SHARED_MAILBOX = process.env.MS_SHARED_MAILBOX!

export interface SendMailParams {
  to: string
  subject: string
  htmlBody: string
}

export async function sendMail({ to, subject, htmlBody }: SendMailParams) {
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
    },
    saveToSentItems: true,
  })
}
