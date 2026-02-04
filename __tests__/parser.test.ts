import { parseEmailContent, normalizeEmail, parseDate } from '../lib/intake/parser'
import { classifyDocumentType, isBaseDocument, isCaseDocument } from '../lib/intake/classifier'
import { DocumentType } from '@prisma/client'

describe('Email Parser', () => {
  test('normalizeEmail should lowercase and trim', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com')
  })

  test('parseEmailContent should extract email from body', () => {
    const body = 'Email: juan.perez@example.com\nNombre: Juan Pérez'
    const result = parseEmailContent('Test', body, 'sender@example.com')
    expect(result.email).toBe('juan.perez@example.com')
  })

  test('parseEmailContent should fallback to fromEmail', () => {
    const body = 'No email here'
    const result = parseEmailContent('Test', body, 'sender@example.com')
    expect(result.email).toBe('sender@example.com')
  })

  test('parseEmailContent should extract cédula', () => {
    const body = 'Cédula: 001-1234567-8'
    const result = parseEmailContent('Test', body, 'test@example.com')
    expect(result.cedula).toBe('00112345678')
  })

  test('parseEmailContent should extract destino', () => {
    const body = 'Destino: Estados Unidos, Nueva York'
    const result = parseEmailContent('Test', body, 'test@example.com')
    expect(result.destinoPais).toBe('Estados Unidos')
    expect(result.destinoCiudad).toBe('Nueva York')
  })

  test('parseDate should handle DD/MM/YYYY', () => {
    const date = parseDate('15/03/2024')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2024)
    expect(date?.getMonth()).toBe(2) // 0-indexed
    expect(date?.getDate()).toBe(15)
  })
})

describe('Document Classifier', () => {
  test('classifyDocumentType should identify cédula', () => {
    expect(classifyDocumentType('cedula.pdf', 'application/pdf')).toBe(DocumentType.CEDULA)
    expect(classifyDocumentType('CÉDULA_FRONTAL.jpg', 'image/jpeg')).toBe(DocumentType.CEDULA)
  })

  test('classifyDocumentType should identify pasaporte', () => {
    expect(classifyDocumentType('passport.pdf', 'application/pdf')).toBe(DocumentType.PASAPORTE)
    expect(classifyDocumentType('pasaporte_scan.jpg', 'image/jpeg')).toBe(DocumentType.PASAPORTE)
  })

  test('classifyDocumentType should identify foto', () => {
    expect(classifyDocumentType('foto.jpg', 'image/jpeg')).toBe(DocumentType.FOTO)
    expect(classifyDocumentType('photo.png', 'image/png')).toBe(DocumentType.FOTO)
  })

  test('classifyDocumentType should identify carta invitación', () => {
    expect(classifyDocumentType('invitacion.pdf', 'application/pdf')).toBe(DocumentType.CARTA_INVITACION)
    expect(classifyDocumentType('carta_invitacion.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(DocumentType.CARTA_INVITACION)
  })

  test('isBaseDocument should return true for base docs', () => {
    expect(isBaseDocument(DocumentType.CEDULA)).toBe(true)
    expect(isBaseDocument(DocumentType.PASAPORTE)).toBe(true)
    expect(isBaseDocument(DocumentType.FOTO)).toBe(true)
  })

  test('isCaseDocument should return true for case docs', () => {
    expect(isCaseDocument(DocumentType.CARTA_INVITACION)).toBe(true)
    expect(isCaseDocument(DocumentType.AGENDA)).toBe(true)
    expect(isCaseDocument(DocumentType.TICKET)).toBe(true)
  })
})
