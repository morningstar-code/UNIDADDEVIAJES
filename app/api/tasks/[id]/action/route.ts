import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { processTaskAction } from '@/lib/workflow/actions'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request)
  if (!user) {
    return response!
  }

  try {
    const { action, comment } = await request.json()

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await processTaskAction(params.id, user.userId, action, comment)

    if (!result.success) {
      const status = result.error === 'Forbidden' ? 403 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({
      success: true,
      nextTaskId: result.nextTaskId,
    })
  } catch (error) {
    console.error('Task action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
