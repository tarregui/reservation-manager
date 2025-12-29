import { supabase } from './supabase'

export interface Reserva {
  id?: string
  personas: number
  fecha: string // YYYY-MM-DD
  horario: string // HH:mm
  nombre: string
  email: string
  telefono: string
  estado?: 'confirmada' | 'cancelada' | 'completada'
}

/**
 * Verificar disponibilidad (solo lectura)
 * OJO: esto es informativo, la validación REAL está en la RPC
 */
export async function verificarDisponibilidad(
  fecha: string,
  horario: string,
  personas: number
): Promise<{ disponible: boolean; lugaresDisponibles: number }> {

  const { data: config } = await supabase
    .from('configuracion')
    .select('capacidad_maxima')
    .single()

  const capacidadMaxima = config?.capacidad_maxima ?? 40

  const { data: reservas } = await supabase
    .from('reservas')
    .select('personas')
    .eq('fecha', fecha)
    .eq('horario', horario)
    .eq('estado', 'confirmada')

  const ocupadas = reservas?.reduce((sum, r) => sum + r.personas, 0) ?? 0
  const disponibles = capacidadMaxima - ocupadas

  return {
    disponible: personas <= disponibles,
    lugaresDisponibles: Math.max(disponibles, 0)
  }
}

/**
 * Crear reserva (RPC – ÚNICA forma válida)
 */
export async function crearReserva(reserva: Reserva) {
  const { data, error } = await supabase.rpc('crear_reserva', {
    p_personas: reserva.personas,
    p_fecha: reserva.fecha,
    p_horario: reserva.horario,
    p_nombre: reserva.nombre,
    p_email: reserva.email,
    p_telefono: reserva.telefono
  })

  if (error) throw error
  return data
}

/**
 * Obtener reservas (admin)
 */
export async function obtenerReservas() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .order('fecha', { ascending: true })
    .order('horario', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Cancelar reserva (admin)
 */
export async function cancelarReserva(id: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', id)

  if (error) throw error
}

/**
 * Obtener configuración
 */
export async function obtenerConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .single()

  if (error) throw error
  return data
}

/**
 * Actualizar configuración (admin)
 */
export async function actualizarConfiguracion(
  capacidadMaxima: number,
  horariosDisponibles: string[]
) {
  const { error } = await supabase
    .from('configuracion')
    .update({
      capacidad_maxima: capacidadMaxima,
      horarios_disponibles: horariosDisponibles
    })
    .eq('id', 1)

  if (error) throw error
}
