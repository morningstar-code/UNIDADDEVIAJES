import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { processTaskAction } from '@/lib/workflow/actions'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action, comment } = await request.json()

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await processTaskAction(params.id, authUser.userId, action, comment)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
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
