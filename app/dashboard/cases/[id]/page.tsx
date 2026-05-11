'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ─── Translation dictionaries ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE_CLASIFICACION: 'Pendiente clasificación',
  AUTORIZACION_RECIBIDA: 'Autorización recibida',
  PENDIENTE_VALIDACION_AMPARO: 'Pendiente validación Amparo',
  VALIDADO_POR_AMPARO: 'Validado por Amparo',
  DEVUELTO_POR_AMPARO: 'Devuelto por Amparo',
  RECHAZADO_POR_AMPARO: 'Rechazado por Amparo',
  INSTRUCCION_RECIBIDA: 'Instrucción recibida',
  SIN_MEMORANDO_JUSTIFICADO: 'Sin memorando justificado',
  VIAJE_IMPREVISTO: 'Viaje imprevisto',
  FUERA_PLAZO_MAPRE: 'Fuera de plazo MAPRE',
  PENDIENTE_DESIGNACION: 'Pendiente designación',
  MEMORANDO_PRESIDENCIA: 'Memorando Presidencia',
  CORREO_INSTRUCCION: 'Correo de instrucción',
  INSTRUCCION_DIRECTA_RI: 'Instrucción directa RI',
  MATRIZ_PROGRAMADA_CONFIRMADA: 'Matriz programada confirmada',
  OTRO: 'Otro',
  MEMORANDO_FORMAL: 'Memorando formal',
  CORREO_AMPARO: 'Correo de Amparo',
  CORREO_PRESIDENCIA: 'Correo de Presidencia',
  CORREO_DIRECTOR_SECRETARIA: 'Correo director/secretaria',
  INSTRUCCION_VERBAL_REGISTRADA: 'Instrucción verbal registrada',
  WHATSAPP: 'WhatsApp',
  MATRIZ_REGISTRADA: 'Matriz registrada',
  PENDIENTE_PAUTA_RI: 'Pendiente pauta RI',
  PAUTA_RI_DADA: 'Pauta RI dada',
  DESIGNACION_BORRADOR: 'Borrador de designación',
  DESIGNACION_GENERADA: 'Designación generada',
  DESIGNACION_ENVIADA: 'Designación enviada',
  PENDIENTE_ACEPTACION_COLABORADOR: 'Pendiente aceptación del colaborador',
  COLABORADOR_ACEPTO: 'Colaborador aceptó',
  COLABORADOR_RECHAZO: 'Colaborador rechazó',
  PENDIENTE_DOCUMENTOS: 'Pendiente documentos',
  DOCUMENTOS_EN_REVISION: 'Documentos en revisión',
  DOCUMENTOS_COMPLETOS: 'Documentos completos',
  FORMULARIO_EN_ELABORACION: 'Formulario en elaboración',
  CARTA_EN_ELABORACION: 'Carta en elaboración',
  EXPEDIENTE_ARMADO: 'Expediente armado',
  ENVIADO_MAPRE: 'Enviado a MAPRE',
  DESPACHO_REVIEW: 'Revisión despacho',
  CONSEJO_DIRECTIVO_FIRMA: 'Consejo Directivo – firma',
  EXPEDIENTE_FIRMADO_RECIBIDO: 'Expediente firmado recibido',
  COORDINACION_ADMINISTRATIVA: 'Coordinación administrativa',
  VIAJE_REALIZADO: 'Viaje realizado',
  PENDIENTE_INFORME_Y_LIQUIDACION: 'Pendiente informe y liquidación',
  PENDIENTE_LIQUIDACION: 'Pendiente liquidación',
  LIQUIDACION_EN_REVISION: 'Liquidación en revisión',
  LIQUIDACION_REQUIERE_CORRECCION: 'Liquidación requiere corrección',
  LIQUIDACION_APROBADA: 'Liquidación aprobada',
  NO_APLICA_LIQUIDACION: 'No aplica liquidación',
  FIRMA_DIGITAL_PENDIENTE_JUSTIFICACION: 'Firma digital pendiente de justificación',
  CANCELLED: 'Cancelado',
  CLOSED: 'Cerrado',
  RECEIVED: 'Recibido',
  DOCS_VALIDATION: 'Validación de documentos',
  TECH_REVIEW: 'Revisión técnica',
  MANAGER_APPROVAL: 'Aprobación gerencial',
  FINANCE_APPROVAL: 'Aprobación finanzas',
  HR_APPROVAL: 'Aprobación RRHH',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  NEEDS_INFO: 'Solicitar información',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  MEMORANDO_AUTORIZACION_PRESIDENCIA: 'Memorando / autorización de Presidencia',
  EVIDENCIA_INSTRUCCION_DIRECTA: 'Evidencia de instrucción directa',
  CORREO_INSTRUCCION: 'Correo de instrucción',
  CORREO_DESIGNACION: 'Correo de designación',
  ACEPTACION_COLABORADOR: 'Aceptación del colaborador',
  CEDULA: 'Cédula de identidad',
  PASAPORTE: 'Pasaporte',
  VISA: 'Visa',
  FOTO: 'Fotografía',
  CARTA_INVITACION: 'Carta de invitación',
  INVITACION: 'Invitación',
  AGENDA: 'Agenda del evento',
  TICKET: 'Tiquete / boleto',
  MEMO_APROBACION: 'Memo de aprobación',
  FORMULARIO_SOLICITUD_VIAJE: 'Formulario de solicitud de viaje al exterior',
  FORMULARIO_SOLICITUD_VIAJE_EXTERIOR: 'Formulario de solicitud de viaje al exterior',
  CARTA_MAPRE: 'Carta MAPRE',
  CARTA_MINISTRO_ADMINISTRATIVO: 'Carta al Ministro Administrativo de la Presidencia',
  EXPEDIENTE_FIRMADO: 'Expediente firmado',
  JUSTIFICACION_FIRMA_DIGITAL: 'Justificación firma digital',
  FORMULARIO_LIQUIDACION_INFORMATIVO: 'Formulario de liquidación – informativo',
  FORMULARIO_LIQUIDACION_GENERADO: 'Formulario de liquidación generado',
  FORMULARIO_LIQUIDACION_COMPLETADO: 'Formulario de liquidación completado',
  FACTURAS_LIQUIDACION: 'Facturas de liquidación',
  VOLANTE_DEPOSITO_REMANENTE: 'Volante de depósito de remanente',
  INFORME_EVENTO: 'Informe del evento',
  OTROS_ANEXOS_LIQUIDACION: 'Otros anexos de liquidación',
  FORMULARIO_OFICIAL: 'Formulario oficial',
  CARTA_MINISTRO: 'Carta al Ministro',
  EXPEDIENTE_COMPLETO: 'Expediente completo',
  DOCUMENTO_PRELIMINAR: 'Documento preliminar',
  OTRO: 'Otro',
}

const DOC_REQ_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  GENERATED: 'Generado',
  UPLOADED: 'Cargado',
  VALIDATED: 'Validado',
  REJECTED: 'Rechazado',
  WAIVED: 'No aplica',
  ENVIADO_COMO_ANEXO_INFORMATIVO: 'Enviado como anexo',
  PENDIENTE_USO_POST_VIAJE: 'Pendiente – post viaje',
}

const DOC_REQ_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: '#fff3cd', color: '#664d03' },
  GENERATED: { bg: '#cfe2ff', color: '#084298' },
  UPLOADED: { bg: '#cfe2ff', color: '#084298' },
  VALIDATED: { bg: '#d1e7dd', color: '#0a3622' },
  REJECTED: { bg: '#f8d7da', color: '#58151c' },
  WAIVED: { bg: '#e9ecef', color: '#495057' },
  ENVIADO_COMO_ANEXO_INFORMATIVO: { bg: '#d1e7dd', color: '#0a3622' },
  PENDIENTE_USO_POST_VIAJE: { bg: '#fff3cd', color: '#664d03' },
}

const DESIGNATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado por el colaborador',
  REJECTED: 'Rechazado por el colaborador',
  EXPIRED: 'Expirado',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RI_DIRECTORA: 'Dirección de Relaciones Internacionales',
  VIAJES_ANALISTA: 'Unidad de Viajes',
  DESPACHO: 'Despacho',
  CONSEJO_DIRECTIVO: 'Consejo Directivo',
  JEFE: 'Jefatura',
  FINANZAS: 'Finanzas',
  RRHH: 'Recursos Humanos',
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  AUTHORIZATION_UPLOADED: 'Autorización formal cargada',
  DIRECT_INSTRUCTION_CREATED: 'Instrucción directa registrada',
  AMPARO_VALIDATED: 'Amparo validó la autorización',
  AMPARO_RETURNED: 'Amparo devolvió la autorización',
  AMPARO_REJECTED: 'Amparo rechazó la autorización',
  URGENT_TRAVEL_CREATED: 'Viaje imprevisto registrado',
  OUT_OF_MAPRE_DEADLINE: 'Viaje fuera de plazo MAPRE',
  MATRIX_ENTRY_CONVERTED: 'Matriz convertida en expediente',
  DESIGNATION_READY: 'Designación lista para enviar',
  MAPRE_LETTER_GENERATED: 'Carta MAPRE generada',
  OFFICIAL_TEMPLATE_USED: 'Plantilla oficial utilizada',
  CORREO_DESIGNACION_GENERADO: 'Correo de designación generado',
  CORREO_DESIGNACION_EDITADO: 'Correo de designación editado',
  CORREO_DESIGNACION_ENVIADO: 'Correo de designación enviado al colaborador',
  COLABORADOR_ACEPTO_DESIGNACION: 'El colaborador aceptó la designación',
  COLABORADOR_RECHAZO_DESIGNACION: 'El colaborador rechazó la designación',
  FORMULARIO_LIQUIDACION_INFORMATIVO_GENERADO: 'Formulario de liquidación informativo generado',
  FORMULARIO_LIQUIDACION_ADJUNTADO_A_DESIGNACION: 'Formulario de liquidación adjuntado al correo de designación',
  FORMULARIO_LIQUIDACION_ENVIADO_COMO_ANEXO: 'Formulario de liquidación enviado como anexo informativo',
  FORMULARIO_LIQUIDACION_GENERADO: 'Formulario de liquidación generado',
  FORMULARIO_LIQUIDACION_SUBIDO: 'Formulario de liquidación completado subido',
  FACTURAS_SUBIDAS: 'Facturas de liquidación subidas',
  VOLANTE_DEPOSITO_SUBIDO: 'Volante de depósito de remanente subido',
  INFORME_EVENTO_SUBIDO: 'Informe del evento subido',
  LIQUIDACION_ENVIADA_REVISION: 'Liquidación enviada a revisión',
  LIQUIDACION_APROBADA: 'Liquidación aprobada',
  LIQUIDACION_DEVUELTA_CORRECCION: 'Liquidación devuelta con observaciones',
  NO_APLICA_LIQUIDACION: 'Se registró que no aplica liquidación',
  CASO_CERRADO: 'Expediente cerrado',
  GENERATED_DOCUMENT_CREATED: 'Documento generado y adjuntado',
  GENERATED_DOCUMENT_DRAFT_SAVED: 'Borrador de documento guardado',
  STAFF_DOCUMENT_UPLOADED: 'Documento subido por el personal',
  COLLABORATOR_DOCUMENT_UPLOADED: 'Documento subido por el colaborador',
  MARK_EXPEDIENTE_COMPLETE: 'Expediente marcado como completo',
  SEND_DESPACHO: 'Expediente enviado a despacho',
  DESPACHO_APPROVE: 'Despacho aprobó el expediente para Consejo Directivo',
  DESPACHO_RETURN: 'Despacho devolvió el expediente con observaciones',
  CONSEJO_SIGN: 'Consejo Directivo registró la firma',
  RECEIVE_SIGNED: 'Se confirmó la recepción del expediente firmado',
  CLOSE: 'Expediente cerrado',
  MARK_TRAVEL_COMPLETED: 'Viaje marcado como realizado',
  REQUEST_LIQUIDATION: 'Se solicitó el informe y la liquidación',
  APPROVE_LIQUIDATION: 'Liquidación aprobada por la Unidad de Viajes',
  RETURN_LIQUIDATION: 'Liquidación devuelta con observaciones para corrección',
  DESIGNATION_EMAIL_SENT: 'Correo de designación enviado',
}

// ─── Workflow stepper steps ──────────────────────────────────────────────────

const STEPPER_STEPS = [
  { key: 'MATRIZ_REGISTRADA', label: 'Matriz registrada' },
  { key: 'AUTORIZACION_RECIBIDA', label: 'Autorización recibida' },
  { key: 'PENDIENTE_VALIDACION_AMPARO', label: 'Validación Amparo' },
  { key: 'PENDIENTE_DESIGNACION', label: 'Pendiente designación' },
  { key: 'DESIGNACION_GENERADA', label: 'Designación generada' },
  { key: 'DESIGNACION_ENVIADA', label: 'Designación enviada' },
  { key: 'PENDIENTE_ACEPTACION_COLABORADOR', label: 'Pendiente aceptación' },
  { key: 'PENDIENTE_DOCUMENTOS', label: 'Pendiente documentos' },
  { key: 'DOCUMENTOS_EN_REVISION', label: 'Documentos en revisión' },
  { key: 'DOCUMENTOS_COMPLETOS', label: 'Documentos completos' },
  { key: 'EXPEDIENTE_ARMADO', label: 'Expediente armado' },
  { key: 'DESPACHO_REVIEW', label: 'Revisión despacho' },
  { key: 'CONSEJO_DIRECTIVO_FIRMA', label: 'Consejo Directivo' },
  { key: 'EXPEDIENTE_FIRMADO_RECIBIDO', label: 'Expediente firmado' },
  { key: 'COORDINACION_ADMINISTRATIVA', label: 'Coordinación' },
  { key: 'VIAJE_REALIZADO', label: 'Viaje realizado' },
  { key: 'PENDIENTE_INFORME_Y_LIQUIDACION', label: 'Liquidación pendiente' },
  { key: 'LIQUIDACION_APROBADA', label: 'Liquidación aprobada' },
  { key: 'CLOSED', label: 'Cerrado' },
]

function getStepperIndex(status: string) {
  // Collapsed statuses to nearest main flow
  const MAP: Record<string, string> = {
    PENDIENTE_CLASIFICACION: 'AUTORIZACION_RECIBIDA',
    INSTRUCCION_RECIBIDA: 'AUTORIZACION_RECIBIDA',
    SIN_MEMORANDO_JUSTIFICADO: 'AUTORIZACION_RECIBIDA',
    VIAJE_IMPREVISTO: 'AUTORIZACION_RECIBIDA',
    FUERA_PLAZO_MAPRE: 'AUTORIZACION_RECIBIDA',
    PENDIENTE_PAUTA_RI: 'AUTORIZACION_RECIBIDA',
    PAUTA_RI_DADA: 'PENDIENTE_DESIGNACION',
    VALIDADO_POR_AMPARO: 'PENDIENTE_DESIGNACION',
    DEVUELTO_POR_AMPARO: 'PENDIENTE_VALIDACION_AMPARO',
    RECHAZADO_POR_AMPARO: 'PENDIENTE_VALIDACION_AMPARO',
    DESIGNACION_BORRADOR: 'DESIGNACION_GENERADA',
    COLABORADOR_ACEPTO: 'PENDIENTE_DOCUMENTOS',
    COLABORADOR_RECHAZO: 'PENDIENTE_ACEPTACION_COLABORADOR',
    FORMULARIO_EN_ELABORACION: 'DOCUMENTOS_COMPLETOS',
    CARTA_EN_ELABORACION: 'DOCUMENTOS_COMPLETOS',
    LIQUIDACION_EN_REVISION: 'PENDIENTE_INFORME_Y_LIQUIDACION',
    LIQUIDACION_REQUIERE_CORRECCION: 'PENDIENTE_INFORME_Y_LIQUIDACION',
    NO_APLICA_LIQUIDACION: 'LIQUIDACION_APROBADA',
    FIRMA_DIGITAL_PENDIENTE_JUSTIFICACION: 'CONSEJO_DIRECTIVO_FIRMA',
    CANCELLED: 'CLOSED',
    REJECTED: 'CLOSED',
    APPROVED: 'CLOSED',
  }
  const mapped = MAP[status] || status
  return STEPPER_STEPS.findIndex((s) => s.key === mapped)
}

// ─── Context-aware workflow actions per status ───────────────────────────────

interface ContextAction {
  id: string
  label: string
  description?: string
  kind: 'primary' | 'secondary' | 'warning' | 'danger'
}

function getContextActions(status: string, _role: string): { title: string; description: string; actions: ContextAction[]; blockers?: string[] } | null {
  switch (status) {
    case 'PENDIENTE_VALIDACION_AMPARO':
      return {
        title: 'Validar autorización Amparo',
        description: 'Amparo / RI debe validar, devolver o rechazar la autorización antes de preparar la designación.',
        actions: [
          { id: 'VALIDATE_AUTHORIZATION', label: 'Validar y dar curso', kind: 'primary' },
          { id: 'RETURN_AUTHORIZATION', label: 'Devolver con observaciones', kind: 'warning' },
          { id: 'REJECT_AUTHORIZATION', label: 'Rechazar', kind: 'danger' },
        ],
      }
    case 'DEVUELTO_POR_AMPARO':
      return {
        title: 'Autorización devuelta por Amparo',
        description: 'El responsable debe corregir o completar la evidencia solicitada antes de reenviar.',
        actions: [],
      }
    case 'RECHAZADO_POR_AMPARO':
      return {
        title: 'Autorización rechazada por Amparo',
        description: 'El expediente no debe avanzar a designación salvo que se cree una nueva autorización.',
        actions: [],
      }
    case 'PENDIENTE_DESIGNACION':
    case 'VALIDADO_POR_AMPARO':
    case 'PAUTA_RI_DADA':
    case 'DESIGNACION_BORRADOR':
      return {
        title: 'Generar y enviar designación al colaborador',
        description: 'La Unidad de Viajes debe preparar y enviar el correo oficial de designación.',
        actions: [
          { id: 'GENERATE_DESIGNATION', label: 'Generar correo de designación', kind: 'primary' },
        ],
      }
    case 'DESIGNACION_GENERADA':
      return {
        title: 'Enviar designación al colaborador',
        description: 'El correo de designación fue generado. Debe enviarse al colaborador con el formulario de liquidación adjunto.',
        actions: [
          { id: 'SEND_DESIGNATION', label: 'Enviar designación', kind: 'primary' },
          { id: 'EDIT_DESIGNATION', label: 'Editar correo', kind: 'secondary' },
        ],
      }
    case 'DESIGNACION_ENVIADA':
    case 'PENDIENTE_ACEPTACION_COLABORADOR':
      return {
        title: 'En espera de respuesta del colaborador',
        description: 'Se envió la designación. Aguardando que el colaborador acepte o rechace.',
        actions: [
          { id: 'RESEND_DESIGNATION', label: 'Reenviar designación', kind: 'secondary' },
        ],
      }
    case 'COLABORADOR_RECHAZO':
      return {
        title: 'El colaborador rechazó la designación',
        description: 'Se debe generar una nueva designación o cancelar el caso.',
        actions: [
          { id: 'GENERATE_DESIGNATION', label: 'Nueva designación', kind: 'primary' },
          { id: 'CANCEL', label: 'Cancelar expediente', kind: 'danger' },
        ],
      }
    case 'PENDIENTE_DOCUMENTOS':
    case 'COLABORADOR_ACEPTO':
      return {
        title: 'Recolección de documentos',
        description: 'El colaborador aceptó la designación. Debe subir los documentos requeridos.',
        actions: [],
      }
    case 'DOCUMENTOS_EN_REVISION':
      return {
        title: 'Revisar documentos del colaborador',
        description: 'Validar o rechazar cada documento del checklist.',
        actions: [
          { id: 'GO_TO_DOCS', label: 'Ir a Documentos', kind: 'primary' },
        ],
      }
    case 'DOCUMENTOS_COMPLETOS':
    case 'FORMULARIO_EN_ELABORACION':
    case 'CARTA_EN_ELABORACION':
      return {
        title: 'Generar documentos del expediente',
        description: 'Crear el formulario de solicitud de viaje y la carta al Ministro Administrativo.',
        actions: [
          { id: 'GENERATE_FORMULARIO', label: 'Formulario de solicitud', kind: 'primary' },
          { id: 'GENERATE_CARTA', label: 'Carta al Ministro', kind: 'secondary' },
        ],
      }
    case 'EXPEDIENTE_ARMADO':
      return {
        title: 'Enviar expediente a Despacho',
        description: 'El expediente está completo. Enviarlo a revisión del Despacho.',
        actions: [
          { id: 'SEND_DESPACHO', label: 'Enviar a Despacho', kind: 'primary' },
        ],
      }
    case 'DESPACHO_REVIEW':
      return {
        title: 'Revisión por Despacho',
        description: 'El Despacho debe revisar el expediente y aprobar o devolver con observaciones.',
        actions: [
          { id: 'DESPACHO_APPROVE', label: 'Aprobar para Consejo Directivo', kind: 'primary' },
          { id: 'DESPACHO_RETURN', label: 'Devolver con observaciones', kind: 'warning' },
        ],
      }
    case 'CONSEJO_DIRECTIVO_FIRMA':
    case 'FIRMA_DIGITAL_PENDIENTE_JUSTIFICACION':
      return {
        title: 'Registro de firma – Consejo Directivo',
        description: 'Registrar la firma presencial del expediente.',
        actions: [
          { id: 'SIGN_PRESENCIAL', label: 'Registrar firma presencial', kind: 'primary' },
          { id: 'SIGN_DIGITAL', label: 'Registrar firma digital justificada', kind: 'secondary' },
          { id: 'CONSEJO_RETURN', label: 'Devolver con observaciones', kind: 'warning' },
        ],
      }
    case 'EXPEDIENTE_FIRMADO_RECIBIDO':
      return {
        title: 'Confirmar recepción del expediente firmado',
        description: 'El expediente fue firmado. Confirmar recepción para continuar con la coordinación.',
        actions: [
          { id: 'RECEIVE_SIGNED', label: 'Confirmar recepción del expediente firmado', kind: 'primary' },
        ],
      }
    case 'COORDINACION_ADMINISTRATIVA':
      return {
        title: 'Coordinación administrativa del viaje',
        description: 'Coordinar tiquetes, viáticos y logística. Una vez realizado el viaje, marcarlo.',
        actions: [
          { id: 'MARK_TRAVEL_COMPLETED', label: 'Marcar viaje realizado', kind: 'primary' },
          { id: 'NO_APLICA_LIQUIDACION', label: 'No aplica liquidación', kind: 'secondary' },
        ],
      }
    case 'VIAJE_REALIZADO':
      return {
        title: 'Iniciar proceso de liquidación post-viaje',
        description: 'Generar el formulario de liquidación y solicitarlo al colaborador.',
        actions: [
          { id: 'GENERATE_LIQUIDACION', label: 'Generar formulario de liquidación', kind: 'primary' },
          { id: 'REQUEST_LIQUIDATION', label: 'Solicitar informe y liquidación', kind: 'secondary' },
          { id: 'NO_APLICA_LIQUIDACION', label: 'No aplica liquidación', kind: 'secondary' },
        ],
      }
    case 'PENDIENTE_INFORME_Y_LIQUIDACION':
    case 'LIQUIDACION_EN_REVISION':
    case 'LIQUIDACION_REQUIERE_CORRECCION':
      return {
        title: 'Revisar liquidación de fondos',
        description: 'Revisar el formulario completado, facturas y soportes.',
        actions: [
          { id: 'APPROVE_LIQUIDATION', label: 'Aprobar liquidación', kind: 'primary' },
          { id: 'RETURN_LIQUIDATION', label: 'Devolver con observaciones', kind: 'warning' },
        ],
      }
    case 'LIQUIDACION_APROBADA':
    case 'NO_APLICA_LIQUIDACION':
      return {
        title: 'Cerrar expediente',
        description: 'La liquidación fue aprobada o no aplica. El expediente puede cerrarse.',
        actions: [
          { id: 'CLOSE', label: 'Cerrar expediente', kind: 'primary' },
        ],
      }
    case 'CLOSED':
    case 'CANCELLED':
      return {
        title: status === 'CLOSED' ? 'Expediente cerrado' : 'Expediente cancelado',
        description: 'Este expediente ya no tiene acciones pendientes.',
        actions: [],
      }
    default:
      return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-DO')
}

function fmtDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-DO')
}

function statusColor(status: string): { bg: string; color: string; border: string } {
  const closed = ['CLOSED', 'APPROVED', 'LIQUIDACION_APROBADA'].includes(status)
  const danger = ['CANCELLED', 'REJECTED', 'COLABORADOR_RECHAZO', 'LIQUIDACION_REQUIERE_CORRECCION', 'RECHAZADO_POR_AMPARO'].includes(status)
  const warning = ['PENDIENTE_PAUTA_RI', 'PENDIENTE_VALIDACION_AMPARO', 'DEVUELTO_POR_AMPARO', 'FUERA_PLAZO_MAPRE', 'PENDIENTE_DOCUMENTOS', 'PENDIENTE_ACEPTACION_COLABORADOR', 'PENDIENTE_INFORME_Y_LIQUIDACION', 'DOCUMENTOS_EN_REVISION', 'LIQUIDACION_EN_REVISION'].includes(status)
  const info = ['AUTORIZACION_RECIBIDA', 'INSTRUCCION_RECIBIDA', 'PENDIENTE_DESIGNACION', 'VALIDADO_POR_AMPARO', 'DESPACHO_REVIEW', 'CONSEJO_DIRECTIVO_FIRMA', 'FIRMA_DIGITAL_PENDIENTE_JUSTIFICACION', 'EXPEDIENTE_FIRMADO_RECIBIDO', 'COORDINACION_ADMINISTRATIVA', 'VIAJE_REALIZADO', 'DESIGNACION_ENVIADA'].includes(status)
  if (closed) return { bg: '#d1e7dd', color: '#0a3622', border: '#a3cfbb' }
  if (danger) return { bg: '#f8d7da', color: '#58151c', border: '#f1aeb5' }
  if (warning) return { bg: '#fff3cd', color: '#664d03', border: '#ffe69c' }
  if (info) return { bg: '#cfe2ff', color: '#084298', border: '#9ec5fe' }
  return { bg: '#e9ecef', color: '#495057', border: '#ced4da' }
}

function kindStyle(kind: ContextAction['kind']): React.CSSProperties {
  const base: React.CSSProperties = { padding: '0.65rem 1.25rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'opacity 0.15s' }
  if (kind === 'primary') return { ...base, backgroundColor: '#0d6efd', color: '#fff' }
  if (kind === 'secondary') return { ...base, backgroundColor: 'transparent', color: '#0d6efd', border: '1.5px solid #0d6efd' }
  if (kind === 'warning') return { ...base, backgroundColor: '#fd7e14', color: '#fff' }
  if (kind === 'danger') return { ...base, backgroundColor: '#dc3545', color: '#fff' }
  return base
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CaseDetail {
  id: string
  status: string
  source: string
  destinoPais: string | null
  destinoCiudad: string | null
  fechaSalida: string | null
  fechaRetorno: string | null
  motivo: string | null
  evento: string | null
  institucionOrganizadora: string | null
  montoEstimado: string | null
  moneda: string | null
  observaciones?: string | null
  profile: {
    id: string
    primaryEmail: string | null
    fullName: string | null
    cargo?: string | null
    departamento?: string | null
    cedula?: string | null
    passportNumber?: string | null
    passportExpirationDate?: string | null
    visaCountry?: string | null
    visaExpirationDate?: string | null
    documents?: Array<{ id: string; docType: string; originalFilename: string; blobUrl: string; source: string; expirationDate: string | null; createdAt: string }>
    externalDocuments?: Array<{ id: string; documentType: string; originalFileName: string; sharePointWebUrl: string | null; status: string; expirationDate: string | null; syncedAt: string }>
  }
  travelAuthorization: {
    id: string
    type: string
    evidenceChannel: string | null
    authorizationDocumentId: string | null
    authorizationDocumentUrl: string | null
    authorizationDocumentName: string | null
    sourceEmailMessageId: string | null
    authorizedBy: string
    registeredByUserId: string | null
    authorizedAt: string | null
    registeredAt: string
    justification: string
    requiresAmparoValidation: boolean
    validationStatus: string
    validationComment: string | null
    validatedByUserId: string | null
    validatedAt: string | null
    isRecurringTravel: boolean
    isUnexpectedTravel: boolean
    isOutOfMapreDeadline: boolean
    mapreDeadline: string | null
  } | null
  documents: Array<{ id: string; docType: string; originalFilename: string; blobUrl: string; mimeType?: string; source?: string; expirationDate?: string | null; sharePointWebUrl?: string | null; createdAt: string }>
  designations: Array<{ id: string; collaboratorEmail: string; subject: string; body: string; status: string; sentAt: string | null }>
  documentRequirements: Array<{ id: string; docType: string; label: string; required: boolean; status: string; observations: string | null; uploadedByName: string | null; uploadedAt: string | null; document: { id: string; originalFilename: string; blobUrl: string; mimeType: string } | null }>
  generatedDocuments: Array<{ id: string; type: string; title: string; status: string; generatedAt: string | null; document: { id: string; originalFilename: string; blobUrl: string; mimeType: string } | null }>
  tasks: Array<{ id: string; step: string; status: string; assignedRole: { name: string } | null; assignedUser: { name: string | null } | null; completedAt: string | null; createdAt: string }>
  auditLogs: Array<{ id: string; action: string; actor: { name: string | null } | null; createdAt: string; details: Record<string, unknown> | null }>
}

type Tab = 'resumen' | 'documentos' | 'expediente' | 'workflow' | 'historial'

interface ProfileOption {
  id: string
  fullName: string | null
  primaryEmail: string | null
  cedula: string | null
  cargo?: string | null
  departamento?: string | null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading } = useAuth()

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null)
  const [loadingCase, setLoadingCase] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('resumen')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [workflowComment, setWorkflowComment] = useState('')
  const [designationDraft, setDesignationDraft] = useState<{ subject: string; body: string } | null>(null)
  const [generatedDraft, setGeneratedDraft] = useState<{ type: string; content: string } | null>(null)
  const [uploadingRequirementId, setUploadingRequirementId] = useState<string | null>(null)
  const [uploadingPostTravelType, setUploadingPostTravelType] = useState<string | null>(null)
  const [signedFile, setSignedFile] = useState<File | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; filename: string; url: string; type: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const [travelerQuery, setTravelerQuery] = useState('')
  const [travelerResults, setTravelerResults] = useState<ProfileOption[]>([])
  const [changingTraveler, setChangingTraveler] = useState(false)

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (user && params.id) fetchCase()
  }, [user, loading, params.id, router])

  function showToast(message: string, kind: 'success' | 'error' = 'success') {
    setToast({ message, kind })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchCase = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/cases/${params.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setCaseDetail(data)
        await fetch(`/api/cases/${params.id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      }
    } catch (e) { console.error(e) }
    finally { setLoadingCase(false) }
  }

  const handleTaskAction = async (taskId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    setActionLoading(taskId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tasks/${taskId}/action`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      })
      if (res.ok) { setComment(''); await fetchCase(); showToast('Acción ejecutada correctamente') }
      else { const d = await res.json(); showToast(d.error || 'No se pudo ejecutar la acción', 'error') }
    } catch { showToast('Error al ejecutar la acción', 'error') }
    finally { setActionLoading(null) }
  }

  const loadDesignationDraft = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/designation`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (res.ok) { setDesignationDraft({ subject: data.subject, body: data.body }); await fetchCase() }
    else showToast(data.error || 'No se pudo generar la designación', 'error')
  }

  const saveDesignation = async (action: 'SAVE_DRAFT' | 'GENERATE_FINAL' | 'SEND') => {
    if (!designationDraft) return
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/designation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...designationDraft, action }),
    })
    const data = await res.json()
    if (res.ok) {
      showToast(action === 'SEND' ? 'Designación enviada al colaborador' : 'Designación actualizada')
      if (action !== 'SAVE_DRAFT') setDesignationDraft(null)
      await fetchCase()
    } else showToast(data.error || 'No se pudo procesar la designación', 'error')
  }

  const updateRequirement = async (requirementId: string, action: 'VALIDATE' | 'REJECT' | 'WAIVE') => {
    const observations = action === 'REJECT' ? prompt('Observaciones para corrección') : undefined
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/requirements/${requirementId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, observations }),
    })
    if (res.ok) { await fetchCase(); showToast('Documento actualizado') }
    else showToast((await res.json()).error || 'No se pudo actualizar el documento', 'error')
  }

  const uploadStaffDocument = async (requirementId: string, docType: string, file: File | null) => {
    if (!file) return
    setUploadingRequirementId(requirementId)
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file); formData.append('docType', docType); formData.append('requirementId', requirementId)
    const res = await fetch(`/api/cases/${params.id}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    setUploadingRequirementId(null)
    if (res.ok) { await fetchCase(); showToast('Documento subido correctamente') }
    else showToast((await res.json()).error || 'No se pudo subir el documento', 'error')
  }

  const uploadPostTravelDocument = async (docType: string, file: File | null) => {
    if (!file) return
    setUploadingPostTravelType(docType)
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file); formData.append('docType', docType)
    const res = await fetch(`/api/cases/${params.id}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    setUploadingPostTravelType(null)
    if (res.ok) { await fetchCase(); showToast('Documento post-viaje subido') }
    else showToast((await res.json()).error || 'No se pudo subir el documento', 'error')
  }

  const generateLiquidationFromTemplate = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/generated-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FORMULARIO_LIQUIDACION', action: 'GENERATE', format: 'xlsx' }),
    })
    if (res.ok) {
      setGeneratedDraft(null)
      await fetchCase()
      showToast('Formulario institucional generado desde la plantilla oficial')
    } else {
      showToast((await res.json()).error || 'No se pudo generar el formulario institucional', 'error')
    }
  }

  const startGeneratedDocument = (type: 'FORMULARIO_SOLICITUD_VIAJE' | 'CARTA_MINISTRO_ADMINISTRATIVO' | 'FORMULARIO_LIQUIDACION') => {
    if (type === 'FORMULARIO_LIQUIDACION') {
      generateLiquidationFromTemplate()
      return
    }
    const title = type === 'FORMULARIO_SOLICITUD_VIAJE' ? 'Formulario de solicitud de viaje al exterior' : 'Carta al Ministro Administrativo de la Presidencia'
    const content = [
      title, '',
      `Nombre: ${caseDetail?.profile.fullName || caseDetail?.profile.primaryEmail || ''}`,
      `Destino: ${caseDetail?.destinoCiudad ? `${caseDetail.destinoCiudad}, ` : ''}${caseDetail?.destinoPais || ''}`,
      `Fechas: ${fmtDate(caseDetail?.fechaSalida)} - ${fmtDate(caseDetail?.fechaRetorno)}`,
      `Evento: ${caseDetail?.evento || ''}`,
      `Objetivo: ${caseDetail?.motivo || ''}`,
      type === 'CARTA_MINISTRO_ADMINISTRATIVO' ? '\nAtentamente,\n\nGuido Gómez Mazara\nPresidente del Consejo Directivo\nINDOTEL' : '',
    ].join('\n')
    setGeneratedDraft({ type, content })
  }

  const saveGeneratedDocument = async (action: 'SAVE_DRAFT' | 'GENERATE') => {
    if (!generatedDraft) return
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/generated-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: generatedDraft.type, action, format: generatedDraft.type === 'FORMULARIO_LIQUIDACION' ? 'xlsx' : 'pdf', draftContent: generatedDraft.content }),
    })
    if (res.ok) { setGeneratedDraft(null); await fetchCase(); showToast('Documento guardado') }
    else showToast((await res.json()).error || 'No se pudo generar el documento', 'error')
  }

  const runWorkflowAction = async (action: string, extra?: Record<string, string>) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/workflow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    if (res.ok) { await fetchCase(); showToast('Acción ejecutada correctamente') }
    else showToast((await res.json()).error || 'No se pudo ejecutar la acción', 'error')
  }

  const runAuthorizationAction = async (action: 'VALIDATE' | 'RETURN' | 'REJECT') => {
    const commentRequired = action !== 'VALIDATE'
    const commentText = commentRequired ? (workflowComment || prompt('Observaciones obligatorias') || '') : workflowComment
    if (commentRequired && !commentText.trim()) {
      showToast('Debe indicar observaciones', 'error')
      return
    }
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/authorization`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment: commentText }),
    })
    if (res.ok) {
      setWorkflowComment('')
      await fetchCase()
      showToast('Validación de autorización actualizada')
    } else {
      showToast((await res.json()).error || 'No se pudo procesar la autorización', 'error')
    }
  }

  const attachProfileDocuments = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/profile-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ docTypes: ['CEDULA', 'PASAPORTE', 'VISA'] }),
    })
    const data = await res.json()
    if (res.ok) {
      await fetchCase()
      const attached = data.attached?.length || 0
      const missing = data.missing?.length || 0
      const expired = data.expired?.length || 0
      showToast(`Documentos adjuntados: ${attached}. Faltantes: ${missing}. Vencidos: ${expired}.`, missing || expired ? 'error' : 'success')
    } else {
      showToast(data.error || 'No se pudieron adjuntar documentos del perfil', 'error')
    }
  }

  const searchTravelers = async (query: string) => {
    setTravelerQuery(query)
    if (query.trim().length < 2) {
      setTravelerResults([])
      return
    }
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setTravelerResults(data.profiles || [])
    }
  }

  const changeTraveler = async (profileId: string) => {
    const comment = prompt('Motivo del cambio de colaborador designado') || ''
    setChangingTraveler(true)
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/cases/${params.id}/traveler`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, comment }),
    })
    setChangingTraveler(false)
    if (res.ok) {
      setTravelerQuery('')
      setTravelerResults([])
      await fetchCase()
      showToast('Colaborador designado actualizado. Use los documentos del nuevo perfil para anexar sus soportes.')
    } else {
      showToast((await res.json()).error || 'No se pudo cambiar el colaborador', 'error')
    }
  }

  const signWorkflow = async () => {
    if (!signedFile) { showToast('Debe seleccionar el archivo del expediente firmado', 'error'); return }
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('action', 'CONSEJO_SIGN')
    formData.append('signatureType', 'PRESENCIAL')
    formData.append('signedBy', user?.name || user?.email || '')
    formData.append('file', signedFile)
    const res = await fetch(`/api/cases/${params.id}/workflow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    if (res.ok) { setSignedFile(null); await fetchCase(); showToast('Firma registrada correctamente') }
    else showToast((await res.json()).error || 'No se pudo registrar la firma', 'error')
  }

  const handleContextAction = (actionId: string) => {
    switch (actionId) {
      case 'GENERATE_DESIGNATION':
      case 'EDIT_DESIGNATION':
        setActiveTab('resumen')
        loadDesignationDraft()
        break
      case 'SEND_DESIGNATION':
      case 'RESEND_DESIGNATION':
        setActiveTab('resumen')
        if (!designationDraft) loadDesignationDraft().then(() => {})
        break
      case 'GENERATE_FORMULARIO':
        setActiveTab('expediente')
        startGeneratedDocument('FORMULARIO_SOLICITUD_VIAJE')
        break
      case 'GENERATE_CARTA':
        setActiveTab('expediente')
        startGeneratedDocument('CARTA_MINISTRO_ADMINISTRATIVO')
        break
      case 'GENERATE_LIQUIDACION':
        setActiveTab('expediente')
        generateLiquidationFromTemplate()
        break
      case 'GO_TO_DOCS':
        setActiveTab('documentos')
        break
      case 'SIGN_PRESENCIAL':
        setActiveTab('expediente')
        break
      case 'VALIDATE_AUTHORIZATION':
        runAuthorizationAction('VALIDATE')
        break
      case 'RETURN_AUTHORIZATION':
        runAuthorizationAction('RETURN')
        break
      case 'REJECT_AUTHORIZATION':
        runAuthorizationAction('REJECT')
        break
      case 'SEND_DESPACHO':
        runWorkflowAction('SEND_DESPACHO')
        break
      case 'DESPACHO_APPROVE':
        runWorkflowAction('DESPACHO_APPROVE')
        break
      case 'DESPACHO_RETURN':
        runWorkflowAction('DESPACHO_RETURN', { comment: workflowComment || prompt('Observaciones') || '' })
        break
      case 'RECEIVE_SIGNED':
        runWorkflowAction('RECEIVE_SIGNED')
        break
      case 'MARK_TRAVEL_COMPLETED':
        runWorkflowAction('MARK_TRAVEL_COMPLETED')
        break
      case 'REQUEST_LIQUIDATION':
        runWorkflowAction('REQUEST_LIQUIDATION')
        break
      case 'APPROVE_LIQUIDATION':
        runWorkflowAction('APPROVE_LIQUIDATION')
        break
      case 'RETURN_LIQUIDATION':
        runWorkflowAction('RETURN_LIQUIDATION', { observations: workflowComment || prompt('Observaciones de corrección') || '' })
        break
      case 'NO_APLICA_LIQUIDACION':
        runWorkflowAction('NO_APLICA_LIQUIDACION', { comment: workflowComment || prompt('Comentario obligatorio') || '' })
        break
      case 'CLOSE':
        runWorkflowAction('CLOSE', { comment: workflowComment || prompt('Comentario de cierre') || '' })
        break
      case 'MARK_EXPEDIENTE_COMPLETE':
        runWorkflowAction('MARK_EXPEDIENTE_COMPLETE')
        break
    }
  }

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading || loadingCase) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
          <p>Cargando expediente…</p>
        </div>
      </div>
    )
  }

  if (!caseDetail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>📁</div>
          <p>Expediente no encontrado</p>
          <Link href="/dashboard/bandeja" style={{ color: '#0d6efd' }}>← Volver a bandeja</Link>
        </div>
      </div>
    )
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const currentTask = caseDetail.tasks.find((t) => t.status === 'PENDING')
  const sc = statusColor(caseDetail.status)
  const stepIdx = getStepperIndex(caseDetail.status)
  const contextActions = getContextActions(caseDetail.status, user?.role || '')
  const caseCode = `TRV-${caseDetail.id.substring(0, 8).toUpperCase()}`

  const preTravelTypes = new Set(['CORREO_DESIGNACION', 'ACEPTACION_COLABORADOR', 'CEDULA', 'PASAPORTE', 'VISA', 'CARTA_INVITACION', 'INVITACION', 'AGENDA', 'FORMULARIO_SOLICITUD_VIAJE', 'CARTA_MINISTRO_ADMINISTRATIVO', 'EXPEDIENTE_FIRMADO'])
  const postTravelTypes = new Set(['FORMULARIO_LIQUIDACION_INFORMATIVO', 'FORMULARIO_LIQUIDACION_GENERADO', 'FORMULARIO_LIQUIDACION_COMPLETADO', 'FACTURAS_LIQUIDACION', 'VOLANTE_DEPOSITO_REMANENTE', 'INFORME_EVENTO', 'OTROS_ANEXOS_LIQUIDACION'])
  const preTravelRequirements = caseDetail.documentRequirements.filter((req) => preTravelTypes.has(req.docType))
  const postTravelRequirements = caseDetail.documentRequirements.filter((req) => postTravelTypes.has(req.docType))
  const informativeLiquidation = caseDetail.generatedDocuments.find((doc) => doc.type === 'FORMULARIO_LIQUIDACION_INFORMATIVO' && doc.document)

  const pendingRequired = preTravelRequirements.filter((r) => r.required && !['VALIDATED', 'WAIVED'].includes(r.status))

  const postTravelUploads = [
    { docType: 'FORMULARIO_LIQUIDACION_COMPLETADO', label: 'Formulario completado' },
    { docType: 'FACTURAS_LIQUIDACION', label: 'Facturas' },
    { docType: 'VOLANTE_DEPOSITO_REMANENTE', label: 'Volante de depósito de remanente' },
    { docType: 'INFORME_EVENTO', label: 'Informe del evento' },
    { docType: 'OTROS_ANEXOS_LIQUIDACION', label: 'Otros anexos' },
  ]

  // ── Styles shared ───────────────────────────────────────────────────────────
  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1.5rem', marginBottom: '1.25rem' }
  const field: React.CSSProperties = { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 2000, padding: '0.875rem 1.25rem', borderRadius: '8px', backgroundColor: toast.kind === 'success' ? '#198754' : '#dc3545', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontWeight: 600, maxWidth: '360px' }}>
          {toast.kind === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      {/* ── Breadcrumb + status bar ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Link href="/dashboard/bandeja" style={{ color: '#1a56db', textDecoration: 'none', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>← Bandeja</Link>
        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>/</span>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Expediente {caseCode}
        </div>
        <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
          {STATUS_LABELS[caseDetail.status] || caseDetail.status}
        </span>
      </div>

      {/* ── Case summary header ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#1a3a6b', color: '#fff', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '0.35rem' }}>Colaborador</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                <Link href={`/dashboard/profiles/${caseDetail.profile.id}`} style={{ color: '#90caf9', textDecoration: 'none' }}>
                  {caseDetail.profile.fullName || caseDetail.profile.primaryEmail}
                </Link>
              </div>
              {caseDetail.profile.cargo && <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: '0.2rem' }}>{caseDetail.profile.cargo}</div>}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '0.35rem' }}>Evento / viaje</div>
              <div style={{ fontWeight: 600 }}>{caseDetail.evento || '—'}</div>
              {caseDetail.institucionOrganizadora && <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: '0.2rem' }}>{caseDetail.institucionOrganizadora}</div>}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '0.35rem' }}>Destino</div>
              <div style={{ fontWeight: 600 }}>{caseDetail.destinoCiudad ? `${caseDetail.destinoCiudad}, ` : ''}{caseDetail.destinoPais || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '0.35rem' }}>Fechas</div>
              <div style={{ fontWeight: 600 }}>{fmtDate(caseDetail.fechaSalida)}</div>
              <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>Retorno: {fmtDate(caseDetail.fechaRetorno)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '0.35rem' }}>Responsable actual</div>
              <div style={{ fontWeight: 600 }}>{currentTask ? (ROLE_LABELS[currentTask.assignedRole?.name || ''] || currentTask.assignedRole?.name || 'Por asignar') : 'Sin tarea activa'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '0.35rem' }}>Próxima acción</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{contextActions?.title || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', overflowX: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content' }}>
          {STEPPER_STEPS.map((step, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            const isTerminal = caseDetail.status === 'CLOSED' || caseDetail.status === 'CANCELLED'
            const dotColor = isTerminal && step.key === 'CLOSED' ? '#198754' : done ? '#198754' : active ? '#0d6efd' : '#ced4da'
            const textColor = active ? '#0d6efd' : done ? '#198754' : '#868e96'
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem 0.5rem', minWidth: '80px', maxWidth: '90px', cursor: 'default' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff', fontWeight: 700, flexShrink: 0, border: active ? '3px solid #0d6efd' : 'none', boxSizing: 'border-box' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '0.35rem', color: textColor, fontWeight: active ? 700 : 400, lineHeight: 1.2 }}>{step.label}</div>
                </div>
                {i < STEPPER_STEPS.length - 1 && (
                  <div style={{ width: 20, height: 2, backgroundColor: done ? '#198754' : '#e0e0e0', flexShrink: 0, marginBottom: '1.2rem' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', gap: 0 }}>
          {(['resumen', 'documentos', 'expediente', 'workflow', 'historial'] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { resumen: 'Resumen', documentos: 'Documentos', expediente: 'Expediente', workflow: 'Workflow', historial: 'Historial' }
            const badges: Partial<Record<Tab, number>> = {
              documentos: pendingRequired.length || undefined,
              workflow: currentTask ? 1 : undefined,
            }
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.875rem 1.25rem', border: 'none', borderBottom: activeTab === tab ? '3px solid #0d6efd' : '3px solid transparent', backgroundColor: 'transparent', color: activeTab === tab ? '#0d6efd' : '#6c757d', fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem', position: 'relative', transition: 'color 0.15s' }}>
                {labels[tab]}
                {badges[tab] ? <span style={{ marginLeft: '0.4rem', backgroundColor: '#dc3545', color: '#fff', borderRadius: '10px', padding: '0 6px', fontSize: '0.7rem', fontWeight: 700 }}>{badges[tab]}</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem' }}>

        {/* ───── RESUMEN ──────────────────────────────────────────────────── */}
        {activeTab === 'resumen' && (
          <div>
            {/* Context action card */}
            {contextActions && (
              <div style={{ ...card, borderLeft: '5px solid #0d6efd', backgroundColor: '#f0f6ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0d6efd', fontWeight: 700, marginBottom: '0.3rem' }}>Acción requerida ahora</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a3a6b', marginBottom: '0.35rem' }}>{contextActions.title}</div>
                    <div style={{ color: '#495057', fontSize: '0.9rem' }}>{contextActions.description}</div>
                    {pendingRequired.length > 0 && contextActions.actions.some((a) => a.id === 'SEND_DESPACHO') && (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '0.85rem', color: '#664d03' }}>
                        <strong>⚠ No puedes enviar a Despacho todavía. Faltan:</strong>
                        <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
                          {pendingRequired.map((r) => <li key={r.id}>{DOC_TYPE_LABELS[r.docType] || r.label}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  {contextActions.actions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-start' }}>
                      {contextActions.actions.map((act) => (
                        <button key={act.id} style={kindStyle(act.kind)} onClick={() => handleContextAction(act.id)}>
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ ...card, borderLeft: `5px solid ${caseDetail.travelAuthorization?.validationStatus === 'VALIDADO_POR_AMPARO' ? '#198754' : caseDetail.travelAuthorization?.validationStatus === 'RECHAZADO_POR_AMPARO' ? '#dc3545' : '#fd7e14'}` }}>
              <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '1rem', borderBottom: '1px solid #e9ecef', paddingBottom: '0.5rem' }}>Autorización del viaje</h3>
              {caseDetail.travelAuthorization ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', fontSize: '0.9rem' }}>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Tipo:</span> <strong>{STATUS_LABELS[caseDetail.travelAuthorization.type] || caseDetail.travelAuthorization.type}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Canal:</span> <strong>{STATUS_LABELS[caseDetail.travelAuthorization.evidenceChannel || ''] || caseDetail.travelAuthorization.evidenceChannel || '—'}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Autorizó:</span> <strong>{caseDetail.travelAuthorization.authorizedBy}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Estado Amparo:</span> <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem', backgroundColor: statusColor(caseDetail.travelAuthorization.validationStatus).bg, color: statusColor(caseDetail.travelAuthorization.validationStatus).color }}>{STATUS_LABELS[caseDetail.travelAuthorization.validationStatus] || caseDetail.travelAuthorization.validationStatus}</span></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Autorizado:</span> <strong>{fmtDateTime(caseDetail.travelAuthorization.authorizedAt)}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Registrado:</span> <strong>{fmtDateTime(caseDetail.travelAuthorization.registeredAt)}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Plazo MAPRE:</span> <strong>{fmtDate(caseDetail.travelAuthorization.mapreDeadline)}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Alertas:</span> <strong>{caseDetail.travelAuthorization.isUnexpectedTravel ? 'Viaje imprevisto' : '—'}{caseDetail.travelAuthorization.isOutOfMapreDeadline ? ' / Fuera de plazo MAPRE' : ''}</strong></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#868e96', marginBottom: '0.25rem' }}>Justificación:</div>
                    <div style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '0.75rem' }}>{caseDetail.travelAuthorization.justification}</div>
                  </div>
                  {caseDetail.travelAuthorization.validationComment && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: '#868e96', marginBottom: '0.25rem' }}>Observación Amparo:</div>
                      <div style={{ backgroundColor: '#fff3cd', borderRadius: '6px', padding: '0.75rem', color: '#664d03' }}>{caseDetail.travelAuthorization.validationComment}</div>
                    </div>
                  )}
                  {caseDetail.travelAuthorization.authorizationDocumentUrl && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <a href={caseDetail.travelAuthorization.authorizationDocumentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', fontWeight: 700 }}>
                        Ver soporte: {caseDetail.travelAuthorization.authorizationDocumentName || 'documento de autorización'}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#664d03', backgroundColor: '#fff3cd', padding: '0.85rem', borderRadius: '6px' }}>
                  Este expediente no tiene autorización previa registrada. Si es un expediente nuevo, cree la autorización antes de enviar designación. Los casos legados se mantienen compatibles.
                </div>
              )}
            </div>

            <div style={{ ...card, borderLeft: '5px solid #198754' }}>
              <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '1rem', borderBottom: '1px solid #e9ecef', paddingBottom: '0.5rem' }}>Colaborador y documentos base</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{caseDetail.profile.fullName || caseDetail.profile.primaryEmail || 'Colaborador sin nombre'}</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>Cédula: {caseDetail.profile.cedula || 'No registrada'}</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>Pasaporte: {caseDetail.profile.passportNumber || 'No registrado'}</div>
                  {caseDetail.profile.passportExpirationDate && (
                    <div style={{ color: new Date(caseDetail.profile.passportExpirationDate) < new Date() ? '#dc3545' : '#666', fontSize: '0.9rem' }}>
                      Vence pasaporte: {fmtDate(caseDetail.profile.passportExpirationDate)}
                    </div>
                  )}
                  {caseDetail.profile.visaCountry && (
                    <div style={{ color: caseDetail.profile.visaExpirationDate && new Date(caseDetail.profile.visaExpirationDate) < new Date() ? '#dc3545' : '#666', fontSize: '0.9rem' }}>
                      Visa: {caseDetail.profile.visaCountry}{caseDetail.profile.visaExpirationDate ? ` vence ${fmtDate(caseDetail.profile.visaExpirationDate)}` : ''}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Disponibles en perfil</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    Blob/manual: {caseDetail.profile.documents?.length || 0} · SharePoint: {caseDetail.profile.externalDocuments?.length || 0}
                  </div>
                  <button onClick={attachProfileDocuments} style={{ ...kindStyle('primary'), marginTop: '0.75rem' }}>
                    Usar documentos de este perfil en el expediente
                  </button>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Cambiar colaborador designado</div>
                  <input
                    value={travelerQuery}
                    onChange={(e) => searchTravelers(e.target.value)}
                    placeholder="Buscar por nombre, cédula o email"
                    style={{ width: '100%', padding: '0.65rem', border: '1px solid #ced4da', borderRadius: '6px' }}
                  />
                  {travelerResults.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {travelerResults.slice(0, 5).map((profile) => (
                        <button
                          key={profile.id}
                          disabled={changingTraveler}
                          onClick={() => changeTraveler(profile.id)}
                          style={{ padding: '0.55rem', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff', textAlign: 'left', cursor: 'pointer' }}
                        >
                          {profile.fullName || profile.primaryEmail || 'Perfil'} {profile.cedula ? `· ${profile.cedula}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {(caseDetail.profile.externalDocuments || []).length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #e9ecef', paddingTop: '0.75rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Documentos SharePoint del perfil</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {caseDetail.profile.externalDocuments!.slice(0, 6).map((doc) => (
                      <span key={doc.id} style={{ padding: '0.35rem 0.6rem', borderRadius: '999px', backgroundColor: '#e7f1ff', color: '#084298', fontSize: '0.8rem' }}>
                        {doc.documentType}: {doc.originalFileName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Viaje */}
              <div style={card}>
                <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '1rem', borderBottom: '1px solid #e9ecef', paddingBottom: '0.5rem' }}>Información del viaje</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Estado:</span> <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem', backgroundColor: sc.bg, color: sc.color }}>{STATUS_LABELS[caseDetail.status] || caseDetail.status}</span></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Destino:</span> <strong>{caseDetail.destinoCiudad ? `${caseDetail.destinoCiudad}, ` : ''}{caseDetail.destinoPais || '—'}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Salida:</span> <strong>{fmtDate(caseDetail.fechaSalida)}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Retorno:</span> <strong>{fmtDate(caseDetail.fechaRetorno)}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Evento:</span> <span>{caseDetail.evento || '—'}</span></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Institución:</span> <span>{caseDetail.institucionOrganizadora || '—'}</span></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Objetivo:</span> <span>{caseDetail.motivo || '—'}</span></div>
                  {caseDetail.montoEstimado && <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Monto est.:</span> <strong>{caseDetail.montoEstimado} {caseDetail.moneda || 'USD'}</strong></div>}
                </div>
              </div>

              {/* Colaborador */}
              <div style={card}>
                <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '1rem', borderBottom: '1px solid #e9ecef', paddingBottom: '0.5rem' }}>Colaborador designado</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Nombre:</span> <Link href={`/dashboard/profiles/${caseDetail.profile.id}`} style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 600 }}>{caseDetail.profile.fullName || caseDetail.profile.primaryEmail}</Link></div>
                  {caseDetail.profile.cargo && <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Cargo:</span> <span>{caseDetail.profile.cargo}</span></div>}
                  {caseDetail.profile.departamento && <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Área:</span> <span>{caseDetail.profile.departamento}</span></div>}
                  <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Correo:</span> <span>{caseDetail.profile.primaryEmail}</span></div>
                  {caseDetail.profile.cedula && <div style={field}><span style={{ color: '#868e96', minWidth: 120 }}>Cédula:</span> <span>{caseDetail.profile.cedula}</span></div>}
                </div>

                {/* Designation status */}
                {caseDetail.designations?.[0] && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong>Designación:</strong> {DESIGNATION_STATUS_LABELS[caseDetail.designations[0].status] || caseDetail.designations[0].status}
                    {caseDetail.designations[0].sentAt && <div style={{ color: '#666', marginTop: '0.25rem' }}>Enviada: {fmtDateTime(caseDetail.designations[0].sentAt)}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Designation editor */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '1rem', borderBottom: '1px solid #e9ecef', paddingBottom: '0.5rem' }}>Correo de designación</h3>
              {!designationDraft ? (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button style={kindStyle('primary')} onClick={loadDesignationDraft}>Generar / editar correo de designación</button>
                  {informativeLiquidation?.document && (
                    <a href={informativeLiquidation.document.blobUrl} target="_blank" rel="noopener noreferrer" style={{ ...kindStyle('secondary') as React.CSSProperties, textDecoration: 'none', display: 'inline-block' }}>
                      Descargar formulario institucional de liquidación
                    </a>
                  )}
                  {!informativeLiquidation && <span style={{ color: '#868e96', fontSize: '0.85rem' }}>El formulario institucional se generará desde la plantilla oficial al crear la designación.</span>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#495057' }}>Asunto</label>
                  <input value={designationDraft.subject} onChange={(e) => setDesignationDraft((prev) => prev ? { ...prev, subject: e.target.value } : prev)} style={{ padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem', width: '100%' }} />
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#495057' }}>Cuerpo del correo</label>
                  <textarea value={designationDraft.body} onChange={(e) => setDesignationDraft((prev) => prev ? { ...prev, body: e.target.value } : prev)} style={{ minHeight: '200px', padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem', width: '100%', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button style={kindStyle('secondary')} onClick={() => saveDesignation('SAVE_DRAFT')}>Guardar borrador</button>
                    <button style={kindStyle('secondary')} onClick={() => saveDesignation('GENERATE_FINAL')}>Generar versión final</button>
                    <button style={kindStyle('primary')} onClick={() => saveDesignation('SEND')}>Enviar / reenviar designación</button>
                    <button style={kindStyle('secondary')} onClick={() => setDesignationDraft(null)}>Cancelar</button>
                  </div>
                  {caseDetail.generatedDocuments.filter((d) => d.type === 'CORREO_DESIGNACION' && d.document).map((d) => (
                    <a key={d.id} href={d.document!.blobUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', fontSize: '0.85rem' }}>↓ Descargar correo generado</a>
                  ))}
                </div>
              )}

              {/* Informative liquidation badge */}
              {informativeLiquidation?.document && (
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: '#d1e7dd', borderRadius: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📎</span>
                  <div style={{ flex: 1, fontSize: '0.875rem' }}>
                    <strong>Formulario institucional de liquidación adjuntado como anexo informativo</strong>
                    {caseDetail.designations?.[0]?.sentAt && <span style={{ color: '#0a3622', marginLeft: '0.5rem' }}>· Enviado: {fmtDateTime(caseDetail.designations[0].sentAt)}</span>}
                    <div style={{ color: '#0a3622', marginTop: '0.25rem' }}>Archivo generado desde la plantilla oficial, conservando formato, celdas combinadas, estilos y fórmulas.</div>
                  </div>
                  <a href={informativeLiquidation.document.blobUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0a3622', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>Descargar</a>
                </div>
              )}
            </div>

            {/* Alerts */}
            {pendingRequired.length > 0 && (
              <div style={{ ...card, borderLeft: '5px solid #fd7e14', backgroundColor: '#fff8f0' }}>
                <strong style={{ color: '#7c3e0a' }}>⚠ Documentos requeridos pendientes</strong>
                <ul style={{ margin: '0.5rem 0 0 1.2rem', padding: 0, color: '#7c3e0a', fontSize: '0.9rem' }}>
                  {pendingRequired.map((r) => <li key={r.id}>{DOC_TYPE_LABELS[r.docType] || r.label}</li>)}
                </ul>
                <button style={{ ...kindStyle('warning'), marginTop: '0.75rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('documentos')}>Ver checklist de documentos</button>
              </div>
            )}
          </div>
        )}

        {/* ───── DOCUMENTOS ───────────────────────────────────────────────── */}
        {activeTab === 'documentos' && (
          <div>
            {[
              { title: 'A) Documentos pre-viaje y expediente de autorización', items: preTravelRequirements },
              { title: 'B) Documentos post-viaje – liquidación y cierre', items: postTravelRequirements },
            ].map((group) => (
              <div key={group.title} style={card}>
                <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>{group.title}</h3>
                {group.items.length === 0 ? (
                  <p style={{ color: '#868e96', fontSize: '0.9rem', margin: 0 }}>Sin documentos registrados en este grupo.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          {['Documento', 'Requerido', 'Estado', 'Archivo', 'Cargado por', 'Fecha', 'Observaciones', 'Acciones'].map((h) => (
                            <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((req, ri) => {
                          const sc2 = DOC_REQ_STATUS_COLORS[req.status] || { bg: '#e9ecef', color: '#495057' }
                          return (
                            <tr key={req.id} style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle', fontWeight: 500 }}>{DOC_TYPE_LABELS[req.docType] || req.label}</td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle', textAlign: 'center' }}>{req.required ? <span style={{ color: '#dc3545', fontWeight: 700 }}>Sí</span> : <span style={{ color: '#868e96' }}>No</span>}</td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: sc2.bg, color: sc2.color, fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                  {DOC_REQ_STATUS_LABELS[req.status] || req.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                                {req.document ? (
                                  <button onClick={() => setSelectedDocument({ id: req.document!.id, filename: req.document!.originalFilename, url: req.document!.blobUrl, type: req.document!.mimeType })} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.82rem' }}>
                                    {req.document.originalFilename.length > 22 ? req.document.originalFilename.slice(0, 20) + '…' : req.document.originalFilename}
                                  </button>
                                ) : <span style={{ color: '#ced4da' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#495057' }}>{req.uploadedByName || <span style={{ color: '#ced4da' }}>—</span>}</td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#495057' }}>{req.uploadedAt ? fmtDate(req.uploadedAt) : <span style={{ color: '#ced4da' }}>—</span>}</td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle', color: '#dc3545', fontSize: '0.82rem', maxWidth: 160 }}>{req.observations || <span style={{ color: '#ced4da' }}>—</span>}</td>
                              <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button onClick={() => updateRequirement(req.id, 'VALIDATE')} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#198754', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>Validar</button>
                                  <button onClick={() => updateRequirement(req.id, 'REJECT')} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>Rechazar</button>
                                  <button onClick={() => updateRequirement(req.id, 'WAIVE')} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>No aplica</button>
                                  <label style={{ padding: '0.3rem 0.6rem', backgroundColor: '#0d6efd', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                    {uploadingRequirementId === req.id ? 'Subiendo…' : 'Subir'}
                                    <input type="file" style={{ display: 'none' }} onChange={(e) => uploadStaffDocument(req.id, req.docType, e.target.files?.[0] || null)} />
                                  </label>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* All raw documents */}
            {caseDetail.documents.length > 0 && (
              <div style={card}>
                <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>C) Todos los archivos del caso</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {caseDetail.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e9ecef', borderRadius: '6px', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.originalFilename}</div>
                        <div style={{ color: '#868e96', fontSize: '0.8rem', marginTop: '0.15rem' }}>{DOC_TYPE_LABELS[doc.docType] || doc.docType} · {fmtDate(doc.createdAt)}</div>
                      </div>
                      <button onClick={() => setSelectedDocument({ id: doc.id, filename: doc.originalFilename, url: doc.blobUrl, type: doc.mimeType || '' })} style={{ padding: '0.4rem 0.9rem', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>Ver</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post-travel uploads */}
            <div style={card}>
              <h3 style={{ margin: '0 0 0.75rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>D) Carga de documentos post-viaje</h3>
              <p style={{ color: '#868e96', fontSize: '0.875rem', marginTop: 0, marginBottom: '1rem' }}>Solo después de realizado el viaje. No forman parte del expediente inicial ante MAPRE.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {postTravelUploads.map((item) => {
                  const existing = postTravelRequirements.find((r) => r.docType === item.docType && r.document)
                  return (
                    <div key={item.docType} style={{ border: '1.5px dashed #ced4da', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#495057', marginBottom: '0.5rem' }}>{item.label}</div>
                      {existing && <div style={{ fontSize: '0.78rem', color: '#198754', marginBottom: '0.5rem' }}>✓ Subido</div>}
                      <label style={{ display: 'inline-block', padding: '0.4rem 0.9rem', backgroundColor: uploadingPostTravelType === item.docType ? '#6c757d' : '#0d6efd', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                        {uploadingPostTravelType === item.docType ? 'Subiendo…' : existing ? 'Reemplazar' : 'Subir'}
                        <input type="file" style={{ display: 'none' }} onChange={(e) => uploadPostTravelDocument(item.docType, e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ───── EXPEDIENTE ────────────────────────────────────────────────── */}
        {activeTab === 'expediente' && (
          <div>
            {/* Generated documents */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>Documentos del expediente de autorización</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button style={kindStyle('primary')} onClick={() => startGeneratedDocument('FORMULARIO_SOLICITUD_VIAJE')}>Formulario de solicitud de viaje</button>
                <button style={kindStyle('secondary')} onClick={() => startGeneratedDocument('CARTA_MINISTRO_ADMINISTRATIVO')}>Carta al Ministro Administrativo</button>
              </div>
              {generatedDraft && ['FORMULARIO_SOLICITUD_VIAJE', 'CARTA_MINISTRO_ADMINISTRATIVO'].includes(generatedDraft.type) && (
                <div style={{ marginBottom: '1rem' }}>
                  <textarea value={generatedDraft.content} onChange={(e) => setGeneratedDraft((prev) => prev ? { ...prev, content: e.target.value } : prev)} style={{ width: '100%', minHeight: '250px', padding: '0.75rem', border: '1.5px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button style={kindStyle('secondary')} onClick={() => saveGeneratedDocument('SAVE_DRAFT')}>Guardar borrador</button>
                    <button style={kindStyle('primary')} onClick={() => saveGeneratedDocument('GENERATE')}>Generar PDF y adjuntar</button>
                    <button style={kindStyle('secondary')} onClick={() => setGeneratedDraft(null)}>Cancelar</button>
                  </div>
                </div>
              )}
              {caseDetail.generatedDocuments.filter((d) => ['FORMULARIO_SOLICITUD_VIAJE', 'CARTA_MINISTRO_ADMINISTRATIVO', 'CORREO_DESIGNACION'].includes(d.type)).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {caseDetail.generatedDocuments.filter((d) => ['FORMULARIO_SOLICITUD_VIAJE', 'CARTA_MINISTRO_ADMINISTRATIVO', 'CORREO_DESIGNACION'].includes(d.type)).map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e9ecef', borderRadius: '6px', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{doc.title}</span>
                        <span style={{ marginLeft: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '10px', backgroundColor: doc.status === 'ATTACHED' ? '#d1e7dd' : '#fff3cd', color: doc.status === 'ATTACHED' ? '#0a3622' : '#664d03', fontSize: '0.78rem' }}>{doc.status === 'ATTACHED' ? 'Generado' : doc.status === 'DRAFT' ? 'Borrador' : doc.status}</span>
                      </div>
                      {doc.document && (
                        <a href={doc.document.blobUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>↓ Descargar</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Workflow actions for expedition */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>Acciones del expediente</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <button style={kindStyle('secondary')} onClick={() => runWorkflowAction('MARK_EXPEDIENTE_COMPLETE')}>Marcar expediente completo</button>
                <button style={kindStyle('primary')} onClick={() => runWorkflowAction('SEND_DESPACHO')} disabled={pendingRequired.length > 0}>
                  Enviar a Despacho {pendingRequired.length > 0 && `(faltan ${pendingRequired.length} docs)`}
                </button>
                <button style={kindStyle('primary')} onClick={() => runWorkflowAction('DESPACHO_APPROVE')}>Despacho aprueba → enviar a Consejo</button>
                <button style={kindStyle('warning')} onClick={() => runWorkflowAction('DESPACHO_RETURN')}>Despacho devuelve con observaciones</button>
                <button style={kindStyle('secondary')} onClick={() => runWorkflowAction('RECEIVE_SIGNED')}>Confirmar recepción del expediente firmado</button>
              </div>

              {/* Signature */}
              <div style={{ padding: '1rem', border: '1.5px solid #dee2e6', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <strong style={{ color: '#1a3a6b' }}>Registrar firma – Consejo Directivo</strong>
                <p style={{ color: '#868e96', fontSize: '0.85rem', margin: '0.4rem 0 0.75rem' }}>Adjuntar el expediente firmado. La firma presencial es la regla general.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input type="file" onChange={(e) => setSignedFile(e.target.files?.[0] || null)} style={{ fontSize: '0.85rem' }} />
                  <button style={kindStyle('primary')} onClick={signWorkflow}>Registrar firma presencial</button>
                </div>
              </div>
            </div>

            {/* Liquidation form */}
            <div style={card}>
              <h3 style={{ margin: '0 0 0.75rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>Formulario de liquidación – post-viaje</h3>
              <p style={{ color: '#868e96', fontSize: '0.875rem', marginTop: 0 }}>Se genera directamente desde la plantilla institucional original en Excel. No es una vista simplificada ni un borrador visual.</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button style={kindStyle('primary')} onClick={generateLiquidationFromTemplate}>Generar formulario institucional (.xlsx)</button>
              </div>
              {caseDetail.generatedDocuments.filter((d) => d.type === 'FORMULARIO_LIQUIDACION' && d.document).map((doc) => (
                <div key={doc.id} style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e9ecef', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600 }}>{doc.title}</span>
                  <a href={doc.document!.blobUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>↓ Descargar</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ───── WORKFLOW ──────────────────────────────────────────────────── */}
        {activeTab === 'workflow' && (
          <div>
            {/* Context action card */}
            {contextActions && (
              <div style={{ ...card, borderLeft: '5px solid #0d6efd', backgroundColor: '#f0f6ff' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0d6efd', fontWeight: 700, marginBottom: '0.35rem' }}>Acción requerida ahora</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a3a6b', marginBottom: '0.4rem' }}>{contextActions.title}</div>
                <div style={{ color: '#495057', fontSize: '0.9rem', marginBottom: '1rem' }}>{contextActions.description}</div>
                {contextActions.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {contextActions.actions.map((act) => (
                      <button key={act.id} style={kindStyle(act.kind)} onClick={() => handleContextAction(act.id)}>{act.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current task */}
            {currentTask && (
              <div style={card}>
                <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>Tarea activa</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 80 }}>Paso:</span> <strong>{currentTask.step}</strong></div>
                  <div style={field}><span style={{ color: '#868e96', minWidth: 80 }}>Asignado a:</span> <strong>{ROLE_LABELS[currentTask.assignedRole?.name || ''] || currentTask.assignedRole?.name || 'Sin asignar'}</strong></div>
                </div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#495057', marginBottom: '0.4rem' }}>Comentario (opcional)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribir comentario u observación…" style={{ width: '100%', minHeight: '80px', padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '0.75rem', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button onClick={() => handleTaskAction(currentTask.id, 'APPROVE')} disabled={actionLoading === currentTask.id} style={{ ...kindStyle('primary'), opacity: actionLoading === currentTask.id ? 0.6 : 1 }}>{actionLoading === currentTask.id ? 'Procesando…' : 'Aprobar'}</button>
                  <button onClick={() => handleTaskAction(currentTask.id, 'REJECT')} disabled={actionLoading === currentTask.id} style={{ ...kindStyle('danger'), opacity: actionLoading === currentTask.id ? 0.6 : 1 }}>Rechazar</button>
                  <button onClick={() => handleTaskAction(currentTask.id, 'REQUEST_INFO')} disabled={actionLoading === currentTask.id} style={{ ...kindStyle('warning'), opacity: actionLoading === currentTask.id ? 0.6 : 1 }}>Solicitar información</button>
                </div>
              </div>
            )}

            {/* Advanced workflow actions */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>Todas las acciones del flujo</h3>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#495057', marginBottom: '0.4rem' }}>Comentario u observaciones para la acción</label>
              <textarea value={workflowComment} onChange={(e) => setWorkflowComment(e.target.value)} placeholder="Comentario u observación (requerido en algunas acciones)…" style={{ width: '100%', minHeight: '70px', padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1rem', resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.65rem' }}>
                {[
                  { id: 'MARK_EXPEDIENTE_COMPLETE', label: 'Marcar expediente completo', kind: 'secondary' },
                  { id: 'SEND_DESPACHO', label: 'Enviar a Despacho', kind: 'primary' },
                  { id: 'DESPACHO_APPROVE', label: 'Despacho aprueba → Consejo', kind: 'primary' },
                  { id: 'DESPACHO_RETURN', label: 'Despacho devuelve con obs.', kind: 'warning' },
                  { id: 'RECEIVE_SIGNED', label: 'Confirmar expediente firmado recibido', kind: 'secondary' },
                  { id: 'MARK_TRAVEL_COMPLETED', label: 'Marcar viaje realizado', kind: 'primary' },
                  { id: 'REQUEST_LIQUIDATION', label: 'Solicitar informe y liquidación', kind: 'secondary' },
                  { id: 'APPROVE_LIQUIDATION', label: 'Aprobar liquidación', kind: 'primary' },
                  { id: 'RETURN_LIQUIDATION', label: 'Devolver liquidación con obs.', kind: 'warning' },
                  { id: 'NO_APLICA_LIQUIDACION', label: 'No aplica liquidación', kind: 'secondary' },
                  { id: 'CLOSE', label: 'Cerrar expediente', kind: 'danger' },
                ].map((btn) => (
                  <button key={btn.id} style={{ ...kindStyle(btn.kind as ContextAction['kind']), textAlign: 'left', width: '100%' }} onClick={() => {
                    const extra = workflowComment ? { comment: workflowComment, observations: workflowComment } : undefined
                    runWorkflowAction(btn.id, extra)
                  }}>{btn.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ───── HISTORIAL ─────────────────────────────────────────────────── */}
        {activeTab === 'historial' && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem', color: '#1a3a6b', fontSize: '0.95rem', fontWeight: 700 }}>Historial del expediente</h3>
            {caseDetail.auditLogs.length === 0 ? (
              <p style={{ color: '#868e96' }}>Sin registros de auditoría todavía.</p>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                <div style={{ position: 'absolute', left: '0.65rem', top: 0, bottom: 0, width: 2, backgroundColor: '#e9ecef' }} />
                {caseDetail.auditLogs.map((log, i) => {
                  const isFirst = i === caseDetail.auditLogs.length - 1
                  const label = AUDIT_ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
                  return (
                    <div key={log.id} style={{ position: 'relative', marginBottom: '1.25rem', paddingLeft: '1.25rem' }}>
                      <div style={{ position: 'absolute', left: '-1.5rem', top: '0.4rem', width: 12, height: 12, borderRadius: '50%', backgroundColor: isFirst ? '#198754' : '#0d6efd', border: '2px solid #fff', zIndex: 1 }} />
                      <div style={{ backgroundColor: '#fafafa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#212529', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{label}</div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#868e96' }}>
                          <span>👤 {log.actor?.name || 'Sistema'}</span>
                          <span>🕐 {fmtDateTime(log.createdAt)}</span>
                          {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                            <details style={{ display: 'inline' }}>
                              <summary style={{ cursor: 'pointer', color: '#0d6efd' }}>Detalles</summary>
                              <pre style={{ marginTop: '0.4rem', fontSize: '0.75rem', backgroundColor: '#f8f9fa', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(log.details, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Document preview modal ────────────────────────────────────────── */}
      {selectedDocument && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }} onClick={() => setSelectedDocument(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', maxWidth: '90vw', width: '700px', maxHeight: '90vh', overflow: 'auto', position: 'relative', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedDocument(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>×</button>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', paddingRight: '2rem', color: '#1a3a6b' }}>{selectedDocument.filename}</h3>
            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, backgroundColor: '#f5f5f5', borderRadius: '6px', padding: '1rem' }}>
              {selectedDocument.type.startsWith('image/') ? (
                <img src={selectedDocument.url} alt={selectedDocument.filename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              ) : selectedDocument.type === 'application/pdf' ? (
                <iframe src={selectedDocument.url} style={{ width: '100%', minHeight: 480, border: 'none' }} title={selectedDocument.filename} />
              ) : (
                <div style={{ textAlign: 'center', color: '#868e96' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📄</div>
                  <p>Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer" style={{ ...kindStyle('secondary') as React.CSSProperties, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>🔗 Abrir en nueva pestaña</a>
              <a href={selectedDocument.url} download={selectedDocument.filename} style={{ ...kindStyle('primary') as React.CSSProperties, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>⬇ Descargar</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
