import { prisma } from '@/lib/db/prisma'
import { CaseStatus, TaskStatus, WorkflowStep } from '@prisma/client'

export type TaskAction = 'APPROVE' | 'REJECT' | 'REQUEST_INFO'

const WORKFLOW_STEPS: WorkflowStep[] = [
  WorkflowStep.DOCS_VALIDATION,
  WorkflowStep.TECH_REVIEW,
  WorkflowStep.MANAGER_APPROVAL,
  WorkflowStep.FINANCE_APPROVAL,
  WorkflowStep.HR_APPROVAL,
]

const STEP_TO_STATUS: Record<WorkflowStep, CaseStatus> = {
  [WorkflowStep.DOCS_VALIDATION]: CaseStatus.DOCS_VALIDATION,
  [WorkflowStep.TECH_REVIEW]: CaseStatus.TECH_REVIEW,
  [WorkflowStep.MANAGER_APPROVAL]: CaseStatus.MANAGER_APPROVAL,
  [WorkflowStep.FINANCE_APPROVAL]: CaseStatus.FINANCE_APPROVAL,
  [WorkflowStep.HR_APPROVAL]: CaseStatus.HR_APPROVAL,
}

export async function processTaskAction(
  taskId: string,
  userId: string,
  action: TaskAction,
  comment?: string
): Promise<{ success: boolean; nextTaskId?: string; error?: string }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { case: true },
  })

  if (!task) {
    return { success: false, error: 'Task not found' }
  }

  if (task.status !== TaskStatus.PENDING) {
    return { success: false, error: 'Task is not pending' }
  }

  // Verify user has permission (check role or assignment)
  if (task.assignedUserId && task.assignedUserId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    })

    if (!user || task.assignedRoleId !== user.roleId) {
      return { success: false, error: 'Unauthorized' }
    }
  }

  try {
    if (action === 'REJECT') {
      // Reject case
      await prisma.case.update({
        where: { id: task.caseId },
        data: { status: CaseStatus.REJECTED },
      })

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.CANCELLED,
          completedAt: new Date(),
        },
      })

      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          caseId: task.caseId,
          action: 'TASK_REJECTED',
          details: { taskId, step: task.step, comment },
        },
      })

      return { success: true }
    }

    if (action === 'REQUEST_INFO') {
      // Request info - send back to initial step
      await prisma.case.update({
        where: { id: task.caseId },
        data: { status: CaseStatus.NEEDS_INFO },
      })

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.CANCELLED,
          completedAt: new Date(),
        },
      })

      // Create new task at DOCS_VALIDATION
      const viajesAnalistaRole = await prisma.role.findUnique({
        where: { name: 'VIAJES_ANALISTA' },
      })

      let nextTaskId: string | undefined
      if (viajesAnalistaRole) {
        const newTask = await prisma.task.create({
          data: {
            caseId: task.caseId,
            step: WorkflowStep.DOCS_VALIDATION,
            assignedRoleId: viajesAnalistaRole.id,
            status: TaskStatus.PENDING,
          },
        })
        nextTaskId = newTask.id
      }

      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          caseId: task.caseId,
          action: 'TASK_REQUEST_INFO',
          details: { taskId, step: task.step, comment },
        },
      })

      return { success: true, nextTaskId }
    }

    if (action === 'APPROVE') {
      // Approve task and move to next step
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      })

      const currentStepIndex = WORKFLOW_STEPS.indexOf(task.step)
      const nextStepIndex = currentStepIndex + 1

      if (nextStepIndex >= WORKFLOW_STEPS.length) {
        // All steps completed - approve case
        await prisma.case.update({
          where: { id: task.caseId },
          data: { status: CaseStatus.APPROVED },
        })

        await prisma.auditLog.create({
          data: {
            actorUserId: userId,
            caseId: task.caseId,
            action: 'CASE_APPROVED',
            details: { taskId, step: task.step, comment },
          },
        })

        return { success: true }
      }

      // Create next task
      const nextStep = WORKFLOW_STEPS[nextStepIndex]
      const nextStatus = STEP_TO_STATUS[nextStep]

      await prisma.case.update({
        where: { id: task.caseId },
        data: { status: nextStatus },
      })

      // Find role for next step
      const roleName = getRoleForStep(nextStep)
      const nextRole = await prisma.role.findUnique({
        where: { name: roleName },
      })

      let nextTaskId: string | undefined
      if (nextRole) {
        const nextTask = await prisma.task.create({
          data: {
            caseId: task.caseId,
            step: nextStep,
            assignedRoleId: nextRole.id,
            status: TaskStatus.PENDING,
          },
        })
        nextTaskId = nextTask.id
      }

      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          caseId: task.caseId,
          action: 'TASK_APPROVED',
          details: { taskId, step: task.step, nextStep, comment },
        },
      })

      return { success: true, nextTaskId }
    }

    return { success: false, error: 'Invalid action' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

function getRoleForStep(step: WorkflowStep): string {
  switch (step) {
    case WorkflowStep.DOCS_VALIDATION:
      return 'VIAJES_ANALISTA'
    case WorkflowStep.TECH_REVIEW:
      return 'VIAJES_ANALISTA'
    case WorkflowStep.MANAGER_APPROVAL:
      return 'JEFE'
    case WorkflowStep.FINANCE_APPROVAL:
      return 'FINANZAS'
    case WorkflowStep.HR_APPROVAL:
      return 'RRHH'
    default:
      return 'VIAJES_ANALISTA'
  }
}
