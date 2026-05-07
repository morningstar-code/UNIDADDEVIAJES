import path from 'path'
import { readFile } from 'fs/promises'
import { Case, Profile } from '@prisma/client'
import { generateLiquidationXlsx } from './ooxml'

type CaseWithProfile = Case & { profile: Profile }

export const LIQUIDATION_TEMPLATE_PATH = 'templates/formulario-liquidacion-fondos.xlsx'
export const LIQUIDATION_XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function cleanFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 80)
}

export function buildTravelCode(caseId: string) {
  return `TRV-${caseId.substring(0, 8).toUpperCase()}`
}

export function buildInformativeLiquidationFilename(caseRecord: CaseWithProfile) {
  const collaborator = cleanFilePart(
    caseRecord.profile.fullName || caseRecord.profile.primaryEmail || 'Colaborador'
  )
  return `Formulario_Liquidacion_Viaticos_${buildTravelCode(caseRecord.id)}_${collaborator}.xlsx`
}

export async function generateInformativeLiquidationWorkbook(caseRecord: CaseWithProfile) {
  try {
    const templatePath = path.join(process.cwd(), LIQUIDATION_TEMPLATE_PATH)
    const template = await readFile(templatePath)
    return {
      buffer: template,
      usedTemplate: true,
      needsManualCellMapping: true,
    }
  } catch {
    return {
      buffer: generateLiquidationXlsx(caseRecord),
      usedTemplate: false,
      needsManualCellMapping: false,
    }
  }
}
