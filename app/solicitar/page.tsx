'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { DocumentType } from '@prisma/client'
import { countries, searchCountries } from '@/lib/data/countries'
import { searchCitiesByCountry, getCitiesByCountry } from '@/lib/data/cities'

interface FormData {
  // Personal
  firstName: string
  lastName: string
  email: string
  phone: string
  departamento: string
  cargo: string
  cedula: string

  // Travel
  destinationCountry: string
  destinationCity: string
  departureDate: string
  returnDate: string
  organizerInstitution: string
  eventName: string
  travelReason: string

  // Administrative
  amount: string
  currency: string
  costCenter: string
  notes: string
}

interface DocumentFile {
  file: File
  docType: DocumentType
}

export default function SolicitarPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departamento: '',
    cargo: '',
    cedula: '',
    destinationCountry: '',
    destinationCity: '',
    departureDate: '',
    returnDate: '',
    organizerInstitution: '',
    eventName: '',
    travelReason: '',
    amount: '',
    currency: 'USD',
    costCenter: '',
    notes: '',
  })
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [countrySuggestions, setCountrySuggestions] = useState<string[]>([])
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false)
  const [citySuggestions, setCitySuggestions] = useState<string[]>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [dateWarning, setDateWarning] = useState('')
  const countryInputRef = useRef<HTMLInputElement>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const citySuggestionsRef = useRef<HTMLDivElement>(null)

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        countryInputRef.current &&
        !countryInputRef.current.contains(event.target as Node)
      ) {
        setShowCountrySuggestions(false)
      }
      if (
        citySuggestionsRef.current &&
        !citySuggestionsRef.current.contains(event.target as Node) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target as Node)
      ) {
        setShowCitySuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      
      // Si cambió el país, limpiar ciudad
      if (field === 'destinationCountry' && prev.destinationCountry !== value) {
        updated.destinationCity = ''
      }
      
      return updated
    })
    
    // Si es el campo de país, mostrar sugerencias
    if (field === 'destinationCountry') {
      if (value.trim().length > 0) {
        const suggestions = searchCountries(value)
        setCountrySuggestions(suggestions.slice(0, 10))
        setShowCountrySuggestions(suggestions.length > 0)
      } else {
        setCountrySuggestions([])
        setShowCountrySuggestions(false)
      }
    }
    
    // Si es el campo de ciudad, mostrar sugerencias basadas en el país
    if (field === 'destinationCity') {
      const selectedCountry = formData.destinationCountry
      if (selectedCountry && value.trim().length > 0) {
        const suggestions = searchCitiesByCountry(selectedCountry, value)
        setCitySuggestions(suggestions.slice(0, 10))
        setShowCitySuggestions(suggestions.length > 0)
      } else {
        setCitySuggestions([])
        setShowCitySuggestions(false)
      }
    }
    
    // Validar fecha de salida
    if (field === 'departureDate') {
      validateDepartureDate(value)
    }
  }
  
  const validateDepartureDate = (dateString: string) => {
    if (!dateString) {
      setDateWarning('')
      return
    }
    
    const selectedDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    
    const diffTime = selectedDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 10) {
      setDateWarning(
        `⚠️ Advertencia: La fecha de salida debe ser al menos 10 días después de la fecha de envío de la solicitud. Faltan ${10 - diffDays} día${10 - diffDays !== 1 ? 's' : ''}.`
      )
    } else {
      setDateWarning('')
    }
  }

  const handleCountrySelect = (country: string) => {
    setFormData((prev) => ({ ...prev, destinationCountry: country, destinationCity: '' }))
    setShowCountrySuggestions(false)
    setCountrySuggestions([])
    setCitySuggestions([])
    setShowCitySuggestions(false)
  }
  
  const handleCitySelect = (city: string) => {
    setFormData((prev) => ({ ...prev, destinationCity: city }))
    setShowCitySuggestions(false)
    setCitySuggestions([])
  }

  const handleDocumentAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      setDocuments((prev) => [
        ...prev,
        { file, docType: DocumentType.OTRO },
      ])
    })
  }

  const handleDocumentTypeChange = (index: number, docType: DocumentType) => {
    setDocuments((prev) => {
      const updated = [...prev]
      updated[index].docType = docType
      return updated
    })
  }

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const validateStep = (stepNum: number): boolean => {
    if (stepNum === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        setError('Nombre, apellido y email son requeridos')
        return false
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('Email inválido')
        return false
      }
    }
    if (stepNum === 2) {
      if (!formData.destinationCountry || !formData.destinationCity) {
        setError('País y ciudad de destino son requeridos')
        return false
      }
      if (!formData.departureDate || !formData.returnDate) {
        setError('Fechas de salida y retorno son requeridas')
        return false
      }
      const departure = new Date(formData.departureDate)
      const returnDate = new Date(formData.returnDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      departure.setHours(0, 0, 0, 0)
      
      const diffTime = departure.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 10) {
        setError('La fecha de salida debe ser al menos 10 días después de la fecha de envío de la solicitud')
        return false
      }
      if (returnDate < departure) {
        setError('La fecha de retorno debe ser posterior a la fecha de salida')
        return false
      }
      if (!formData.travelReason) {
        setError('El motivo del viaje es requerido')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    setError('')
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      // Generate client ID for idempotency
      const clientGeneratedId = `public-${Date.now()}-${Math.random().toString(36).substring(7)}`

      // Use FormData instead of JSON to handle large files
      const formDataToSend = new FormData()
      
      // Add form fields
      formDataToSend.append('firstName', formData.firstName)
      formDataToSend.append('lastName', formData.lastName)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', formData.phone || '')
      formDataToSend.append('departamento', formData.departamento || '')
      formDataToSend.append('cargo', formData.cargo || '')
      formDataToSend.append('cedula', formData.cedula || '')
      formDataToSend.append('destinationCountry', formData.destinationCountry)
      formDataToSend.append('destinationCity', formData.destinationCity)
      formDataToSend.append('departureDate', formData.departureDate)
      formDataToSend.append('returnDate', formData.returnDate)
      formDataToSend.append('organizerInstitution', formData.organizerInstitution || '')
      formDataToSend.append('eventName', formData.eventName || '')
      formDataToSend.append('travelReason', formData.travelReason)
      formDataToSend.append('amount', formData.amount || '')
      formDataToSend.append('currency', formData.currency || 'USD')
      formDataToSend.append('costCenter', formData.costCenter || '')
      formDataToSend.append('notes', formData.notes || '')
      formDataToSend.append('clientGeneratedId', clientGeneratedId)

      // Add documents as files
      documents.forEach((doc, index) => {
        formDataToSend.append(`document_${index}`, doc.file)
        formDataToSend.append(`document_${index}_docType`, doc.docType)
      })
      formDataToSend.append('documentCount', documents.length.toString())

      const response = await fetch('/api/public/submit-request', {
        method: 'POST',
        body: formDataToSend,
        // Don't set Content-Type header - browser will set it with boundary
      })

      if (!response.ok) {
        let errorMessage = 'Error al enviar la solicitud'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, use status-based messages
          if (response.status === 413) {
            errorMessage = 'Los archivos son demasiado grandes. Por favor, reduce el tamaño de los documentos o sube menos archivos.'
          } else if (response.status === 500) {
            errorMessage = 'Error del servidor. Por favor, intente nuevamente o contacte al administrador si el problema persiste.'
          } else if (response.status === 400) {
            errorMessage = 'Datos inválidos. Por favor, verifique que todos los campos requeridos estén completos.'
          } else {
            const errorText = await response.text().catch(() => '')
            errorMessage = errorText || errorMessage
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Redirect to success page
      router.push(`/solicitar/success?caseId=${result.caseId}&caseNumber=${result.caseNumber}`)
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header
        style={{
          backgroundColor: 'white',
          padding: '1rem 2rem',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <Image
          src="/indotel-logo.jpg"
          alt="INDOTEL Logo"
          width={60}
          height={60}
          style={{ objectFit: 'contain' }}
        />
        <h1 style={{ margin: 0 }}>INDOTEL - Solicitud de Viaje</h1>
      </header>

      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Progress bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <span style={{ fontWeight: step >= 1 ? 'bold' : 'normal' }}>
              1. Datos Personales
            </span>
            <span style={{ fontWeight: step >= 2 ? 'bold' : 'normal' }}>
              2. Datos del Viaje
            </span>
            <span style={{ fontWeight: step >= 3 ? 'bold' : 'normal' }}>
              3. Datos Administrativos
            </span>
            <span style={{ fontWeight: step >= 4 ? 'bold' : 'normal' }}>
              4. Documentos
            </span>
          </div>
          <div
            style={{
              height: '4px',
              backgroundColor: '#e0e0e0',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(step / 4) * 100}%`,
                backgroundColor: '#0066cc',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Step 1: Personal Data */}
        {step === 1 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0 }}>Datos Personales</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Apellido *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cédula (recomendado)
                </label>
                <input
                  type="text"
                  value={formData.cedula}
                  onChange={(e) => handleInputChange('cedula', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Departamento
                </label>
                <input
                  type="text"
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cargo
                </label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => handleInputChange('cargo', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleNext}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Travel Data */}
        {step === 2 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0 }}>Datos del Viaje</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  País Destino *
                </label>
                <input
                  ref={countryInputRef}
                  type="text"
                  value={formData.destinationCountry}
                  onChange={(e) => handleInputChange('destinationCountry', e.target.value)}
                  onFocus={() => {
                    if (formData.destinationCountry.trim().length > 0) {
                      const suggestions = searchCountries(formData.destinationCountry)
                      setCountrySuggestions(suggestions.slice(0, 10))
                      setShowCountrySuggestions(suggestions.length > 0)
                    }
                  }}
                  required
                  placeholder="Escribe para buscar país..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
                {showCountrySuggestions && countrySuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '0.25rem',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {countrySuggestions.map((country, index) => (
                      <div
                        key={index}
                        onClick={() => handleCountrySelect(country)}
                        onMouseDown={(e) => e.preventDefault()} // Prevenir blur del input
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: index < countrySuggestions.length - 1 ? '1px solid #eee' : 'none',
                          backgroundColor: 'white',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f0f0'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        {country}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Ciudad Destino *
                  {!formData.destinationCountry && (
                    <span style={{ fontSize: '0.8rem', color: '#999', marginLeft: '0.5rem' }}>
                      (Selecciona un país primero)
                    </span>
                  )}
                </label>
                <input
                  ref={cityInputRef}
                  type="text"
                  value={formData.destinationCity}
                  onChange={(e) => handleInputChange('destinationCity', e.target.value)}
                  onFocus={() => {
                    if (formData.destinationCountry && formData.destinationCity.trim().length > 0) {
                      const suggestions = searchCitiesByCountry(formData.destinationCountry, formData.destinationCity)
                      setCitySuggestions(suggestions.slice(0, 10))
                      setShowCitySuggestions(suggestions.length > 0)
                    }
                  }}
                  disabled={!formData.destinationCountry}
                  placeholder={formData.destinationCountry ? "Escribe para buscar ciudad..." : "Selecciona un país primero"}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: !formData.destinationCountry ? '#f5f5f5' : 'white',
                    cursor: !formData.destinationCountry ? 'not-allowed' : 'text',
                  }}
                />
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div
                    ref={citySuggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '0.25rem',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {citySuggestions.map((city, index) => (
                      <div
                        key={index}
                        onClick={() => handleCitySelect(city)}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: index < citySuggestions.length - 1 ? '1px solid #eee' : 'none',
                          backgroundColor: 'white',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f0f0'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Fecha Salida *
                  </label>
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => handleInputChange('departureDate', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Fecha Retorno *
                  </label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => handleInputChange('returnDate', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Institución Organizadora
                </label>
                <input
                  type="text"
                  value={formData.organizerInstitution}
                  onChange={(e) => handleInputChange('organizerInstitution', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Evento
                </label>
                <input
                  type="text"
                  value={formData.eventName}
                  onChange={(e) => handleInputChange('eventName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Motivo del Viaje *
                </label>
                <textarea
                  value={formData.travelReason}
                  onChange={(e) => handleInputChange('travelReason', e.target.value)}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleBack}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleNext}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Administrative Data */}
        {step === 3 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0 }}>Datos Administrativos</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Monto Estimado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  >
                    <option value="USD">USD</option>
                    <option value="DOP">DOP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Centro de Costo
                </label>
                <input
                  type="text"
                  value={formData.costCenter}
                  onChange={(e) => handleInputChange('costCenter', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Observaciones
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleBack}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleNext}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0 }}>Documentos</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Agregar Documentos
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleDocumentAdd}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                Formatos permitidos: PDF, JPG, PNG. Tamaño máximo: 10MB por archivo.
              </p>
            </div>

            {documents.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3>Documentos agregados:</h3>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '500' }}>{doc.file.name}</p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                          {(doc.file.size / 1024).toFixed(2)} KB
                        </p>
                        <select
                          value={doc.docType}
                          onChange={(e) =>
                            handleDocumentTypeChange(index, e.target.value as DocumentType)
                          }
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        >
                          <option value={DocumentType.CEDULA}>Cédula</option>
                          <option value={DocumentType.PASAPORTE}>Pasaporte</option>
                          <option value={DocumentType.CARTA_INVITACION}>
                            Carta de Invitación
                          </option>
                          <option value={DocumentType.AGENDA}>Agenda</option>
                          <option value={DocumentType.MEMO_APROBACION}>
                            Memo de Aprobación
                          </option>
                          <option value={DocumentType.OTRO}>Otro</option>
                        </select>
                      </div>
                      <button
                        onClick={() => removeDocument(index)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginLeft: '1rem',
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleBack}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: loading ? '#999' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
