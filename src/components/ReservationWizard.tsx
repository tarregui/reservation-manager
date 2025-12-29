import { useState } from "react";
import { User, Clock, CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { verificarDisponibilidad, crearReserva } from '../lib/reservations';

function ReservationWizard() {
  const [step, setStep] = useState(1);
  const [personas, setPersonas] = useState<number | null>(null);
  const [fecha, setFecha] = useState<Date | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [mensaje, setMensaje] = useState<{tipo: 'error' | 'success' | 'warning', texto: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [lugaresDisponibles, setLugaresDisponibles] = useState<number | null>(null);

  const horariosDisponibles = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"
  ];

  const nextStep = () => {
    if (step === 3 && !validateForm()) return;
    setStep(step + 1);
  };
  
  const prevStep = () => setStep(step - 1);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    
    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es requerido";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetWizard = () => {
    setStep(1);
    setPersonas(null);
    setFecha(null);
    setHorario(null);
    setFormData({ nombre: "", email: "", telefono: "" });
    setErrors({});
    setMensaje(null);
    setLugaresDisponibles(null);
  };

  // Verificar disponibilidad cuando selecciona horario
  const handleSeleccionarHorario = async (hora: string) => {
    if (!fecha || !personas) return;
    
    setLoading(true);
    setMensaje(null);
    
    try {
      const fechaStr = fecha.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      const { disponible, lugaresDisponibles: lugares } = await verificarDisponibilidad(
        fechaStr, 
        hora, 
        personas
      );
      
      if (disponible) {
        setHorario(hora);
        setLugaresDisponibles(lugares);
        setMensaje({
          tipo: 'success',
          texto: `¡Perfecto! Quedan ${lugares} lugares disponibles para este horario.`
        });
      } else {
        setHorario(null);
        setMensaje({
          tipo: 'error',
          texto: `Lo sentimos, no hay suficiente espacio. Solo quedan ${lugares} lugares disponibles para este horario.`
        });
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al verificar disponibilidad. Por favor intenta nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Finalizar reserva
  const finalizarReserva = async () => {
    if (!fecha || !horario || !personas) return;
    
    setLoading(true);
    
    try {
      await crearReserva({
        personas,
        fecha: fecha.toISOString().split('T')[0],
        horario,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono
      });
      
      setMensaje({
        tipo: 'success',
        texto: '¡Reserva confirmada! Recibirás un email de confirmación.'
      });
      
      setTimeout(() => {
        resetWizard();
      }, 2000);
      
    } catch (error) {
      console.error('Error al crear reserva:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al crear la reserva. Por favor intenta nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step >= s ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`flex-1 h-1 mx-2 transition-all ${
                  step > s ? 'bg-orange-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>Comensales</span>
          <span>Fecha</span>
          <span>Datos</span>
          <span>Confirmar</span>
        </div>
      </div>

      <style>{`
        .react-datepicker {
          font-family: inherit;
          border: none;
          box-shadow: none;
        }
        .react-datepicker__header {
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding-top: 1rem;
        }
        .react-datepicker__current-month {
          font-weight: 600;
          color: #1f2937;
          text-transform: capitalize;
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
        }
        .react-datepicker__day-name {
          color: #6b7280;
          font-weight: 600;
          font-size: 0.75rem;
          width: 2.5rem;
          line-height: 2.5rem;
        }
        .react-datepicker__day {
          width: 2.5rem;
          line-height: 2.5rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          margin: 0.15rem;
          transition: all 0.2s;
        }
        .react-datepicker__day:hover {
          background-color: #fed7aa;
          border-radius: 0.5rem;
        }
        .react-datepicker__day--selected {
          background-color: #f97316;
          color: white;
          font-weight: 600;
        }
        .react-datepicker__day--selected:hover {
          background-color: #ea580c;
        }
        .react-datepicker__day--keyboard-selected {
          background-color: #fed7aa;
          color: #1f2937;
        }
        .react-datepicker__day--disabled {
          color: #d1d5db;
          cursor: not-allowed;
        }
        .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }
        .react-datepicker__day--outside-month {
          color: #d1d5db;
        }
        .react-datepicker__navigation {
          top: 1rem;
        }
        .react-datepicker__navigation--previous {
          left: 1rem;
        }
        .react-datepicker__navigation--next {
          right: 1rem;
        }
        .react-datepicker__navigation-icon::before {
          border-color: #6b7280;
        }
        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: #1f2937;
        }
      `}</style>

      {/* Card Container */}
      <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col" style={{ minHeight: '450px' }}>
        {/* Step 1: Personas */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-6">
              <User className="w-12 h-12 mx-auto mb-3 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Escoja cantidad de comensales</h2>
              <p className="text-sm text-gray-600">Selecciona el número de personas para tu reserva</p>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-3 mb-6">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setPersonas(num)}
                    className={`w-16 h-16 rounded-full font-bold text-xl transition-all border-2 ${
                      personas === num
                        ? 'bg-blue-600 text-white shadow-lg scale-105 border-blue-600'
                        : 'text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (personas && personas > 5) {
                      setPersonas(personas - 1);
                    }
                  }}
                  disabled={!personas || personas <= 5}
                  className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 text-xl font-bold hover:bg-blue-50 transition-all disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  -
                </button>

                <button
                  onClick={() => setPersonas(5)}
                  className={`w-24 h-16 rounded-full font-bold text-xl transition-all border-2 ${
                    personas && personas >= 5
                      ? 'bg-blue-600 text-white shadow-lg scale-105 border-blue-600'
                      : 'text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'
                  }`}
                >
                  {personas && personas >= 5 ? personas : '5'}
                </button>

                <button
                  onClick={() => {
                    if (personas && personas >= 5 && personas < 8) {
                      setPersonas(personas + 1);
                    } else if (!personas || personas < 5) {
                      setPersonas(5);
                    }
                  }}
                  disabled={personas === 8}
                  className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 text-xl font-bold hover:bg-blue-50 transition-all disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-auto">
              <button
                disabled={!personas}
                onClick={nextStep}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-600 transition-all"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Fecha y Horario */}
        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="text-center mb-4">
              <svg className="w-12 h-12 mx-auto mb-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Selecciona fecha y horario</h2>
              <p className="text-sm text-gray-600">Elige cuándo quieres hacer tu reserva</p>
            </div>

            <div className="mb-4 bg-gray-50 rounded-xl p-4 flex justify-center">
              <DatePicker
                selected={fecha}
                onChange={(date: Date | null) => {
                  setFecha(date);
                  setHorario(null);
                  setMensaje(null);
                  setLugaresDisponibles(null);
                }}
                inline
                minDate={new Date()}
                locale="es"
                dateFormat="dd/MM/yyyy"
              />
            </div>

            {fecha && (
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Horarios disponibles
                </h3>
                
                {/* Mensaje de disponibilidad */}
                {mensaje && (
                  <div className={`mb-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
                    mensaje.tipo === 'error' 
                      ? 'bg-red-50 text-red-800 border border-red-200' 
                      : mensaje.tipo === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{mensaje.texto}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-6 gap-1.5">
                  {horariosDisponibles.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => handleSeleccionarHorario(hora)}
                      disabled={loading}
                      className={`p-1.5 rounded-lg font-medium text-xs transition-all ${
                        horario === hora
                          ? 'bg-orange-500 text-white'
                          : loading
                          ? 'bg-gray-100 text-gray-400 cursor-wait'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {hora}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-auto pt-3">
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
              <button
                disabled={!fecha || !horario || loading}
                onClick={nextStep}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-600 transition-all"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Datos de contacto */}
        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-4">
              <User className="w-12 h-12 mx-auto mb-3 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Tus datos de contacto</h2>
              <p className="text-sm text-gray-600">Necesitamos tu información para confirmar la reserva</p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => {
                    setFormData({ ...formData, nombre: e.target.value });
                    setErrors({ ...errors, nombre: "" });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.nombre ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="Juan Pérez"
                />
                {errors.nombre && (
                  <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors({ ...errors, email: "" });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="juan@ejemplo.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => {
                    setFormData({ ...formData, telefono: e.target.value });
                    setErrors({ ...errors, telefono: "" });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.telefono ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="+54 9 11 1234-5678"
                />
                {errors.telefono && (
                  <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-auto">
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 transition-all"
              >
                Confirmar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmación */}
        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-4">
              <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-800 mb-1">¡Casi listo!</h2>
              <p className="text-sm text-gray-600">Revisa los detalles de tu reserva</p>
            </div>

            {/* Mensaje de confirmación/error */}
            {mensaje && (
              <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                mensaje.tipo === 'error' 
                  ? 'bg-red-50 text-red-800 border border-red-200' 
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{mensaje.texto}</span>
              </div>
            )}

            <div className="bg-orange-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600">Comensales</p>
                  <p className="text-base font-semibold text-gray-800">{personas} personas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-600">Fecha y hora</p>
                  <p className="text-base font-semibold text-gray-800">
                    {fecha?.toLocaleDateString('es-AR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} a las {horario}
                  </p>
                </div>
              </div>

              <div className="border-t border-orange-200 pt-3">
                <p className="text-xs text-gray-600 mb-1">Datos de contacto</p>
                <p className="font-semibold text-sm text-gray-800">{formData.nombre}</p>
                <p className="text-sm text-gray-700">{formData.email}</p>
                <p className="text-sm text-gray-700">{formData.telefono}</p>
              </div>
            </div>

            <div className="flex justify-between mt-auto">
              <button
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Modificar
              </button>
              <button
                onClick={finalizarReserva}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Finalizar Reserva
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumen flotante */}
      {step > 1 && step < 4 && (
        <div className="mt-3 bg-white rounded-lg shadow-md p-3">
          <p className="text-xs text-gray-600 mb-1">Resumen de tu reserva:</p>
          <div className="flex gap-3 text-xs flex-wrap">
            {personas && (
              <span className="font-semibold text-gray-800">
                👥 {personas} {personas === 1 ? 'persona' : 'personas'}
              </span>
            )}
            {fecha && (
              <span className="font-semibold text-gray-800">
                📅 {fecha.toLocaleDateString('es-AR')}
              </span>
            )}
            {horario && (
              <span className="font-semibold text-gray-800">
                🕐 {horario}
              </span>
            )}
            {lugaresDisponibles !== null && horario && (
              <span className="font-semibold text-green-600">
                ✓ {lugaresDisponibles} lugares disponibles
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationWizard;