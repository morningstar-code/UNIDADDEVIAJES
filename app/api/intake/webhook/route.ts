import { NextRequest, NextResponse } from 'next/server'
import { processEmailMessage } from '@/lib/intake/processor'
import { getMessage } from '@/lib/graph/messages'

const MS_WEBHOOK_SECRET = process.env.MS_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Handle validation request (Microsoft Graph sends this first)
    if (body.includes('validationToken')) {
      const match = body.match(/validationToken["\s:=]+([^"}\s]+)/)
      if (match) {
        return new NextResponse(match[1], {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    }

    // Parse notification
    const notification = JSON.parse(body)
    const clientState = notification.value?.[0]?.clientState

    // Validate clientState (basic security)
    if (clientState !== MS_WEBHOOK_SECRET) {
      console.warn('Invalid clientState in webhook')
      return NextResponse.json({ error: 'Invalid clientState' }, { status: 401 })
    }

    // Process notifications
    const notifications = notification.value || []
    const results = []

    for (const notif of notifications) {
      try {
        const resource = notif.resource
        const messageId = resource.split('/').pop()

        if (!messageId) {
          continue
        }

        // Get message details
        const message = await getMessage(messageId)

        // Process the message
        const result = await processEmailMessage(message.id, message.internetMessageId)
        results.push({
          messageId: message.internetMessageId,
          success: result.success,
          error: result.error,
        })
      } catch (error) {
        console.error('Error processing notification:', error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
