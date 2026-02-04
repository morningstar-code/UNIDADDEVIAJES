export interface ParsedEmailData {
  email?: string
  fullName?: string
  cedula?: string
  passportNumber?: string
  passportCountry?: string
  phone?: string
  destinoPais?: string
  destinoCiudad?: string
  fechaSalida?: string
  fechaRetorno?: string
  motivo?: string
  evento?: string
  institucionOrganizadora?: string
  montoEstimado?: number
  moneda?: string
  caseId?: string
}

export function parseEmailContent(subject: string, body: string, fromEmail: string): ParsedEmailData {
  const data: ParsedEmailData = {}
  const text = `${subject} ${body}`.toLowerCase()

  // Extract email from body (fallback to fromEmail)
  const emailRegex = /(?:email|correo|e-mail)[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  const emailMatch = body.match(emailRegex)
  data.email = emailMatch ? emailMatch[1].trim().toLowerCase() : fromEmail.toLowerCase().trim()

  // Extract full name
  const nameRegex = /(?:nombre|name|nombre completo)[\s:]*([^\n\r]+)/i
  const nameMatch = body.match(nameRegex)
  if (nameMatch) {
    data.fullName = nameMatch[1].trim()
  }

  // Extract cédula
  const cedulaRegex = /(?:cedula|cédula|id|identificación)[\s:]*([0-9-]+)/i
  const cedulaMatch = body.match(cedulaRegex)
  if (cedulaMatch) {
    data.cedula = cedulaMatch[1].trim().replace(/-/g, '')
  }

  // Extract passport
  const passportRegex = /(?:pasaporte|passport)[\s:]*([A-Z0-9]+)/i
  const passportMatch = body.match(passportRegex)
  if (passportMatch) {
    data.passportNumber = passportMatch[1].trim().toUpperCase()
  }

  // Extract passport country
  const passportCountryRegex = /(?:país del pasaporte|passport country|nacionalidad)[\s:]*([A-Za-z\s]+)/i
  const passportCountryMatch = body.match(passportCountryRegex)
  if (passportCountryMatch) {
    data.passportCountry = passportCountryMatch[1].trim()
  }

  // Extract phone
  const phoneRegex = /(?:teléfono|telefono|phone|tel)[\s:]*([0-9\s\-\(\)\+]+)/i
  const phoneMatch = body.match(phoneRegex)
  if (phoneMatch) {
    data.phone = phoneMatch[1].trim()
  }

  // Extract destino
  const destinoRegex = /(?:destino|país destino|country|ciudad destino|city)[\s:]*([^\n\r]+)/i
  const destinoMatch = body.match(destinoRegex)
  if (destinoMatch) {
    const destino = destinoMatch[1].trim()
    // Try to split país and ciudad
    const parts = destino.split(/[,;]/)
    if (parts.length >= 2) {
      data.destinoPais = parts[0].trim()
      data.destinoCiudad = parts[1].trim()
    } else {
      data.destinoPais = destino
    }
  }

  // Extract dates
  const fechaSalidaRegex = /(?:fecha salida|fecha de salida|departure|salida)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  const fechaSalidaMatch = body.match(fechaSalidaRegex)
  if (fechaSalidaMatch) {
    data.fechaSalida = fechaSalidaMatch[1].trim()
  }

  const fechaRetornoRegex = /(?:fecha retorno|fecha de retorno|return|retorno)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  const fechaRetornoMatch = body.match(fechaRetornoRegex)
  if (fechaRetornoMatch) {
    data.fechaRetorno = fechaRetornoMatch[1].trim()
  }

  // Extract motivo
  const motivoRegex = /(?:motivo|razón|reason|propósito)[\s:]*([^\n\r]+)/i
  const motivoMatch = body.match(motivoRegex)
  if (motivoMatch) {
    data.motivo = motivoMatch[1].trim()
  }

  // Extract evento
  const eventoRegex = /(?:evento|event|conferencia|conference)[\s:]*([^\n\r]+)/i
  const eventoMatch = body.match(eventoRegex)
  if (eventoMatch) {
    data.evento = eventoMatch[1].trim()
  }

  // Extract institución
  const institucionRegex = /(?:institución|institucion|organizador|organizer|institution)[\s:]*([^\n\r]+)/i
  const institucionMatch = body.match(institucionRegex)
  if (institucionMatch) {
    data.institucionOrganizadora = institucionMatch[1].trim()
  }

  // Extract monto
  const montoRegex = /(?:monto|amount|presupuesto|budget)[\s:]*([0-9,\.]+)\s*([A-Z]{3})?/i
  const montoMatch = body.match(montoRegex)
  if (montoMatch) {
    data.montoEstimado = parseFloat(montoMatch[1].replace(/,/g, ''))
    if (montoMatch[2]) {
      data.moneda = montoMatch[2].toUpperCase()
    }
  }

  // Extract CASE_ID if present
  const caseIdRegex = /CASE_ID[=:]\s*([a-f0-9\-]{36})/i
  const caseIdMatch = text.match(caseIdRegex)
  if (caseIdMatch) {
    data.caseId = caseIdMatch[1]
  }

  return data
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  // Try different formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{1,2})-(\d{1,2})-(\d{4})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      let year, month, day
      if (format === formats[2]) {
        // DD-MM-YYYY
        day = parseInt(match[1])
        month = parseInt(match[2]) - 1
        year = parseInt(match[3])
      } else if (format === formats[1]) {
        // DD/MM/YYYY or MM/DD/YYYY (assume DD/MM/YYYY)
        day = parseInt(match[1])
        month = parseInt(match[2]) - 1
        year = parseInt(match[3])
      } else {
        // YYYY-MM-DD
        year = parseInt(match[1])
        month = parseInt(match[2]) - 1
        day = parseInt(match[3])
      }

      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  return null
}
