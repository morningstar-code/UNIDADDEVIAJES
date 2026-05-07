import { Case, Profile } from '@prisma/client'

type CaseWithProfile = Case & { profile: Profile }

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString('es-DO') : 'Por definir'
}

function valueOrDefault(value: string | null | undefined, fallback = 'Por definir') {
  return value?.trim() || fallback
}

export function buildDesignationSubject(caseRecord: CaseWithProfile) {
  return `Correo de designacion - ${caseRecord.evento || caseRecord.destinoPais || 'Viaje institucional'}`
}

export function buildDesignationBody(caseRecord: CaseWithProfile, acceptanceUrl: string) {
  const collaborator = caseRecord.profile.fullName || caseRecord.profile.primaryEmail || 'colaborador'
  const destination = `${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || 'Por definir'}`
  const responsibleName = process.env.UNIDAD_VIAJES_RESPONSABLE_NOMBRE || 'Dolores / Unidad de Viajes'
  const responsibleTitle = process.env.UNIDAD_VIAJES_RESPONSABLE_CARGO || 'Unidad de Viajes'
  const responsiblePhone = process.env.UNIDAD_VIAJES_RESPONSABLE_TELEFONO || 'Por definir'
  const responsibleEmail = process.env.UNIDAD_VIAJES_RESPONSABLE_EMAIL || process.env.MS_SHARED_MAILBOX || 'unidaddeviajes@indotel.gob.do'

  return `
    <p>Estimado/a <strong>${collaborator}</strong>,</p>
    <p>Por instrucciones de la Direccion de Relaciones Internacionales, le informamos que ha sido designado/a para participar en la actividad institucional indicada a continuacion:</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid #d9d9d9;width:100%">
      <tr><td><strong>Nombre del colaborador</strong></td><td>${collaborator}</td></tr>
      <tr><td><strong>Cargo</strong></td><td>${valueOrDefault(caseRecord.profile.cargo)}</td></tr>
      <tr><td><strong>Area</strong></td><td>${valueOrDefault(caseRecord.profile.departamento)}</td></tr>
      <tr><td><strong>Evento</strong></td><td>${valueOrDefault(caseRecord.evento)}</td></tr>
      <tr><td><strong>Modalidad</strong></td><td>Presencial / Por definir</td></tr>
      <tr><td><strong>Destino</strong></td><td>${destination}</td></tr>
      <tr><td><strong>Fechas del evento</strong></td><td>${formatDate(caseRecord.fechaSalida)} - ${formatDate(caseRecord.fechaRetorno)}</td></tr>
      <tr><td><strong>Fecha de salida</strong></td><td>${formatDate(caseRecord.fechaSalida)}</td></tr>
      <tr><td><strong>Fecha de regreso</strong></td><td>${formatDate(caseRecord.fechaRetorno)}</td></tr>
      <tr><td><strong>Institucion organizadora</strong></td><td>${valueOrDefault(caseRecord.institucionOrganizadora)}</td></tr>
      <tr><td><strong>Tipo de beca / cobertura</strong></td><td>${caseRecord.montoEstimado ? `Viaticos estimados ${caseRecord.montoEstimado} ${caseRecord.moneda || 'USD'}` : 'Por definir'}</td></tr>
      <tr><td><strong>Tipo de viatico / DSA</strong></td><td>${valueOrDefault(caseRecord.moneda, 'USD')} / porcentaje por definir</td></tr>
    </table>
    <p><strong>Documentos requeridos:</strong> cedula, pasaporte, visa si aplica, invitacion, agenda si aplica y cualquier soporte solicitado por la Unidad de Viajes.</p>
    <p><strong>Visa:</strong> confirmar si el destino requiere visa antes de la salida. <strong>Vacunas:</strong> verificar requisitos sanitarios del pais de destino.</p>
    <p>Se adjunta, para fines informativos, el formulario de liquidacion de fondos/viaticos que debera ser completado posterior a su participacion, en caso de que reciba viaticos o fondos sujetos a liquidacion. Este formulario debera ser acompanado de las facturas originales, comprobantes correspondientes y volante de deposito de remanente, si aplica, conforme a las instrucciones de la Unidad de Viajes.</p>
    <p>Para continuar el proceso, favor confirmar recepcion, aceptar o rechazar la designacion y cargar los documentos requeridos:</p>
    <p><a href="${acceptanceUrl}" style="background:#0066cc;color:#ffffff;padding:10px 14px;text-decoration:none;border-radius:4px">Abrir designacion segura</a></p>
    <p>Observaciones: ${valueOrDefault(caseRecord.observaciones, 'Sin observaciones adicionales.')}</p>
    <p>Atentamente,<br />
    <strong>${responsibleName}</strong><br />
    ${responsibleTitle}<br />
    Tel.: ${responsiblePhone}<br />
    Email: ${responsibleEmail}</p>
  `
}

export function buildPlainPreview(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
