import { Case, Profile } from '@prisma/client'

type CaseWithProfile = Case & { profile: Profile }

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let c = index
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { dosTime, dosDate }
}

export function createZip(entries: Array<{ name: string; data: string | Buffer }>) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  const { dosTime, dosDate } = dosDateTime()

  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8')
    const crc = crc32(data)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(name.length, 26)
    localHeader.writeUInt16LE(0, 28)
    localParts.push(localHeader, name, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(name.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, name)

    offset += localHeader.length + name.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}

function xml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString('es-DO') : ''
}

export function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function generateDocx(title: string, content: string) {
  const lines = [title, '', ...htmlToPlainText(content).split(/\r?\n/)]
  const paragraphs = lines
    .map((line, index) => {
      const style = index === 0 ? '<w:pStyle w:val="Title"/>' : ''
      return `<w:p><w:pPr>${style}</w:pPr><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`
    })
    .join('')

  return createZip([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: 'word/document.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
    },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>INDOTEL Viajes</Application></Properties>` },
  ])
}

function cell(ref: string, value: string | number | null | undefined) {
  return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`
}

function row(index: number, values: Array<string | number | null | undefined>) {
  const cells = values.map((value, offset) => cell(`${String.fromCharCode(65 + offset)}${index}`, value)).join('')
  return `<row r="${index}">${cells}</row>`
}

export function generateLiquidationXlsx(caseRecord: CaseWithProfile) {
  const currency = caseRecord.moneda || 'USD'
  const advance = caseRecord.montoEstimado?.toString() || '0.00'
  const destination = `${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || ''}`
  const rows = [
    row(1, ['FORMULARIO DE LIQUIDACION DE FONDOS / VIATICOS']),
    row(3, ['Institucion', 'Instituto Dominicano de las Telecomunicaciones']),
    row(4, ['Departamento', caseRecord.profile.departamento || '']),
    row(5, ['Nombre del viajero', caseRecord.profile.fullName || '']),
    row(6, ['Cedula', caseRecord.profile.cedula || '']),
    row(7, ['Destino del viaje', destination]),
    row(8, ['Fecha de salida', formatDate(caseRecord.fechaSalida)]),
    row(9, ['Fecha de regreso', formatDate(caseRecord.fechaRetorno)]),
    row(10, ['Nombre del evento', caseRecord.evento || '']),
    row(11, ['Fecha del reporte', formatDate(new Date())]),
    row(13, ['Avance entregado al servidor', advance]),
    row(14, ['20% gastos menores, si aplica', '0.00']),
    row(15, ['Total viaticos', advance]),
    row(16, ['Gastos realizados', '0.00']),
    row(17, ['Restante a devolver', '0.00']),
    row(18, ['Devolucion a cuenta del INDOTEL', '0.00']),
    row(19, ['Moneda', currency]),
    row(20, ['Tasa de cambio', '0.00']),
    row(21, ['Total RD$', '0.00']),
    row(23, ['Fecha consumo', 'No. factura', 'Descripcion/comercio', 'Hotel', 'Comida', 'Transporte', 'Comunicacion', 'Varios', 'Moneda', 'Subtotal', 'Tasa cambio', 'Total RD$']),
    row(30, ['Firmas']),
    row(31, ['Firma servidor publico', '']),
    row(32, ['Enlace institucional y/o responsable', '']),
    row(33, ['Unidad de Viajes', '']),
    row(35, ['Nota', 'Debe enviarse con anexos de justificacion de gastos y volante de deposito de remanentes cuando corresponda. No incluir facturas de bebidas alcoholicas.']),
  ].join('')

  return createZip([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Liquidacion" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    },
  ])
}
