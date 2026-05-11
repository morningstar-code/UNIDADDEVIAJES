import path from 'path'
import { readFile } from 'fs/promises'
import { inflateRawSync } from 'zlib'
import { Case, Profile } from '@prisma/client'
import { createZip } from './ooxml'

type CaseWithProfile = Case & { profile: Profile }

export const LIQUIDATION_TEMPLATE_PATH = 'templates/formulario-liquidacion-fondos.xlsx'
export const LIQUIDATION_XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const TEMPLATE_SHEET_1 = 'xl/worksheets/sheet1.xml'
const TEMPLATE_SHEET_2 = 'xl/worksheets/sheet2.xml'

export const LIQUIDATION_TEMPLATE_CELL_MAP = {
  institucion: ['Hoja1!B2', 'Hoja2!B2'],
  departamento: ['Hoja1!B3', 'Hoja2!B3'],
  nombreViajero: ['Hoja1!B4', 'Hoja2!B4'],
  cedula: ['Hoja1!B5', 'Hoja2!B5'],
  destinoViaje: ['Hoja1!B6', 'Hoja2!B6'],
  fechaSalida: ['Hoja1!H6', 'Hoja2!H6'],
  fechaRegreso: ['Hoja1!L6', 'Hoja2!L6'],
  nombreEvento: ['Hoja1!B7', 'Hoja2!B7'],
  avanceServidorChequeLb: ['Hoja1!L47', 'Hoja2!G8'],
  gastosMenores20: ['Hoja2!G9'],
  totalViaticos: ['Hoja2!G10'],
  gastosRealizados: ['Hoja1!L46', 'Hoja2!G11'],
  restanteDevolver: ['Hoja1!L48', 'Hoja2!G12'],
  fechaReporte: ['Hoja1!B49'],
} as const

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

function xml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function decimalToNumber(value: unknown) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return Number(value) || 0
}

function excelSerialDate(value?: Date | null) {
  if (!value) return ''
  const utc = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  return Math.floor(utc / 86400000 + 25569)
}

function columnNumber(column: string) {
  return column.split('').reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0)
}

function splitCellRef(ref: string) {
  const match = ref.match(/^([A-Z]+)(\d+)$/)
  if (!match) throw new Error(`Invalid Excel cell reference: ${ref}`)
  return { column: match[1], row: Number(match[2]) }
}

function attr(source: string, name: string) {
  return source.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]
}

function cellStyle(sheetXml: string, ref: string) {
  const match = sheetXml.match(new RegExp(`<c\\b(?=[^>]*\\br="${ref}")[^>]*>`, 'm'))
  return match ? attr(match[0], 's') : undefined
}

function cellXml(ref: string, value: string | number | '', style?: string, options?: { formula?: string; stringFormula?: boolean }) {
  const styleAttr = style ? ` s="${style}"` : ''
  if (options?.formula) {
    const typeAttr = options.stringFormula ? ' t="str"' : ''
    return `<c r="${ref}"${styleAttr}${typeAttr}><f>${xml(options.formula)}</f><v>${xml(value)}</v></c>`
  }
  if (typeof value === 'number') {
    return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`
  }
  return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t>${xml(value)}</t></is></c>`
}

function blankCellXml(ref: string, style?: string) {
  return `<c r="${ref}"${style ? ` s="${style}"` : ''}/>`
}

function setCell(
  sheetXml: string,
  ref: string,
  value: string | number | '',
  options?: { formula?: string; stringFormula?: boolean; styleFrom?: string; blank?: boolean }
) {
  const { row, column } = splitCellRef(ref)
  const rowPattern = new RegExp(`(<row\\b(?=[^>]*\\br="${row}")[^>]*>)([\\s\\S]*?)(</row>)`)
  const rowMatch = sheetXml.match(rowPattern)
  if (!rowMatch) return sheetXml

  const existingCellPattern = new RegExp(`<c\\b(?=[^>]*\\br="${ref}")[^>]*(?:/>|>[\\s\\S]*?</c>)`)
  const existingCell = rowMatch[2].match(existingCellPattern)?.[0]
  const style = existingCell
    ? attr(existingCell.match(/^<c\b[^>]*>/)?.[0] || existingCell, 's')
    : options?.styleFrom
      ? cellStyle(sheetXml, options.styleFrom)
      : undefined
  const nextCell = options?.blank
    ? blankCellXml(ref, style)
    : cellXml(ref, value, style, { formula: options?.formula, stringFormula: options?.stringFormula })

  let nextRowContent = rowMatch[2]
  if (existingCell) {
    nextRowContent = nextRowContent.replace(existingCellPattern, nextCell)
  } else {
    const newColumnNumber = columnNumber(column)
    const cells = [...nextRowContent.matchAll(/<c\b(?=[^>]*\br="([A-Z]+)\d+")[^>]*(?:\/>|>[\s\S]*?<\/c>)/g)]
    const insertBefore = cells.find((cell) => columnNumber(cell[1]) > newColumnNumber)
    if (insertBefore?.index !== undefined) {
      nextRowContent =
        nextRowContent.slice(0, insertBefore.index) + nextCell + nextRowContent.slice(insertBefore.index)
    } else {
      nextRowContent += nextCell
    }
  }

  return sheetXml.replace(rowPattern, `${rowMatch[1]}${nextRowContent}${rowMatch[3]}`)
}

function existingRefsForRow(sheetXml: string, row: number) {
  const rowMatch = sheetXml.match(new RegExp(`<row\\b(?=[^>]*\\br="${row}")[^>]*>([\\s\\S]*?)</row>`))
  if (!rowMatch) return []
  return [...rowMatch[1].matchAll(/<c\b(?=[^>]*\br="([A-Z]+\d+)")[^>]*(?:\/>|>[\s\S]*?<\/c>)/g)].map(
    (match) => match[1]
  )
}

function clearExpenseRows(sheetXml: string) {
  let next = sheetXml
  for (let row = 10; row <= 45; row++) {
    for (const ref of existingRefsForRow(next, row)) {
      const { column } = splitCellRef(ref)
      if (column === 'J') {
        next = setCell(next, ref, 0, { formula: `SUM(D${row}:H${row})` })
      } else if (column === 'L') {
        next = setCell(next, ref, 0, { formula: `+J${row}*K${row}` })
      } else {
        next = setCell(next, ref, '', { blank: true })
      }
    }
  }
  return next
}

type ZipEntry = { name: string; data: Buffer }

function findEndOfCentralDirectory(zip: Buffer) {
  for (let offset = zip.length - 22; offset >= Math.max(0, zip.length - 65557); offset--) {
    if (zip.readUInt32LE(offset) === 0x06054b50) return offset
  }
  throw new Error('Invalid XLSX template: ZIP central directory not found')
}

function readZipEntries(zip: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(zip)
  const totalEntries = zip.readUInt16LE(eocd + 10)
  let pointer = zip.readUInt32LE(eocd + 16)
  const entries: ZipEntry[] = []

  for (let index = 0; index < totalEntries; index++) {
    if (zip.readUInt32LE(pointer) !== 0x02014b50) {
      throw new Error('Invalid XLSX template: ZIP central header not found')
    }
    const method = zip.readUInt16LE(pointer + 10)
    const compressedSize = zip.readUInt32LE(pointer + 20)
    const nameLength = zip.readUInt16LE(pointer + 28)
    const extraLength = zip.readUInt16LE(pointer + 30)
    const commentLength = zip.readUInt16LE(pointer + 32)
    const localHeaderOffset = zip.readUInt32LE(pointer + 42)
    const name = zip.subarray(pointer + 46, pointer + 46 + nameLength).toString('utf8')

    const localNameLength = zip.readUInt16LE(localHeaderOffset + 26)
    const localExtraLength = zip.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressed = zip.subarray(dataStart, dataStart + compressedSize)
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null
    if (!data) throw new Error(`Unsupported XLSX template compression method: ${method}`)

    entries.push({ name, data })
    pointer += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function populateSheet1(sheetXml: string, caseRecord: CaseWithProfile) {
  const destination = `${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || ''}`
  const advance = decimalToNumber(caseRecord.montoEstimado)
  const minorExpenses = advance * 0.2
  const spent = 0
  const remaining = advance - spent - minorExpenses
  const reportDate = excelSerialDate(new Date())

  let next = clearExpenseRows(sheetXml)
  next = setCell(next, 'B2', 'INSTITUTO DOMINICANO DE LAS TELECOMUNICACIONES')
  next = setCell(next, 'B3', caseRecord.profile.departamento || '', { styleFrom: 'B2' })
  next = setCell(next, 'B4', caseRecord.profile.fullName || caseRecord.profile.primaryEmail || '')
  next = setCell(next, 'B5', caseRecord.profile.cedula || '')
  next = setCell(next, 'B6', destination)
  next = setCell(next, 'H6', excelSerialDate(caseRecord.fechaSalida))
  next = setCell(next, 'L6', excelSerialDate(caseRecord.fechaRetorno))
  next = setCell(next, 'B7', caseRecord.evento || '')
  next = setCell(next, 'J46', 0, { formula: 'SUM(J10:J45)' })
  next = setCell(next, 'L46', spent, { formula: 'SUM(L10:L45)' })
  next = setCell(next, 'L47', advance)
  next = setCell(next, 'L48', remaining, { formula: '+(L47-L46)-(L47*20%)' })
  next = setCell(next, 'B49', reportDate)
  return next
}

function populateSheet2(sheetXml: string, caseRecord: CaseWithProfile) {
  const destination = `${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || ''}`
  const advance = decimalToNumber(caseRecord.montoEstimado)
  const minorExpenses = advance * 0.2
  const spent = 0
  const totalViaticos = spent + minorExpenses
  const remaining = advance - spent - minorExpenses

  let next = sheetXml
  next = setCell(next, 'B2', 'INSTITUTO DOMINICANO DE LAS TELECOMUNICACIONES')
  next = setCell(next, 'B3', caseRecord.profile.departamento || '', { formula: '+Hoja1!B3', stringFormula: true, styleFrom: 'B2' })
  next = setCell(next, 'B4', caseRecord.profile.fullName || caseRecord.profile.primaryEmail || '', { formula: '+Hoja1!B4', stringFormula: true })
  next = setCell(next, 'B5', caseRecord.profile.cedula || '', { formula: '+Hoja1!B5', stringFormula: true })
  next = setCell(next, 'B6', destination, { formula: '+Hoja1!B6', stringFormula: true })
  next = setCell(next, 'H6', excelSerialDate(caseRecord.fechaSalida), { formula: '+Hoja1!H6' })
  next = setCell(next, 'L6', excelSerialDate(caseRecord.fechaRetorno), { formula: '+Hoja1!L6' })
  next = setCell(next, 'B7', caseRecord.evento || '', { formula: '+Hoja1!B7', stringFormula: true })
  next = setCell(next, 'G8', advance, { formula: '+Hoja1!L47' })
  next = setCell(next, 'G9', minorExpenses, { formula: '+G8*20%' })
  next = setCell(next, 'G10', totalViaticos, { formula: '+G11+G9' })
  next = setCell(next, 'G11', spent, { formula: '+Hoja1!L46' })
  next = setCell(next, 'G12', remaining, { formula: '+Hoja1!L48' })
  return next
}

export function populateLiquidationTemplate(template: Buffer, caseRecord: CaseWithProfile) {
  const entries = readZipEntries(template).map((entry) => {
    if (entry.name === TEMPLATE_SHEET_1) {
      return { ...entry, data: Buffer.from(populateSheet1(entry.data.toString('utf8'), caseRecord), 'utf8') }
    }
    if (entry.name === TEMPLATE_SHEET_2) {
      return { ...entry, data: Buffer.from(populateSheet2(entry.data.toString('utf8'), caseRecord), 'utf8') }
    }
    return entry
  })

  return createZip(entries)
}

export async function generateInformativeLiquidationWorkbook(caseRecord: CaseWithProfile) {
  const templatePath = path.join(process.cwd(), LIQUIDATION_TEMPLATE_PATH)
  const template = await readFile(templatePath)
  return {
    buffer: populateLiquidationTemplate(template, caseRecord),
    usedTemplate: true,
    mappedCells: LIQUIDATION_TEMPLATE_CELL_MAP,
  }
}
