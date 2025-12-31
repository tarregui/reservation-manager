import { supabase } from './supabase'

export interface Reserva {
  id?: string
  personas: number
  fecha: string // formato 'YYYY-MM-DD'
  horario: string
  nombre: string
  email: string
  telefono: string
  estado?: 'confirmada' | 'cancelada' | 'completada'
}

export interface HorarioDisponible {
  horario: string
  lugares_disponibles: number
}

// Verificar si una fecha tiene disponibilidad
export async function fechaTieneDisponibilidad(
  fecha: string,
  personas: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('fecha_tiene_disponibilidad', {
      p_fecha: fecha,
      p_personas: personas
    })

    if (error) {
      console.error('Error al verificar fecha:', error)
      return true // En caso de error, permitir selección (fail-safe)
    }

    return data as boolean
  } catch (error) {
    console.error('Error en fechaTieneDisponibilidad:', error)
    return true
  }
}

// Obtener horarios disponibles para una fecha específica
export async function obtenerHorariosDisponibles(
  fecha: string,
  personas: number
): Promise<HorarioDisponible[]> {
  try {
    const { data, error } = await supabase.rpc('horarios_disponibles_por_fecha', {
      p_fecha: fecha,
      p_personas: personas
    })

    if (error) throw error
    return data as HorarioDisponible[]
  } catch (error) {
    console.error('Error al obtener horarios:', error)
    throw error
  }
}

// Verificar disponibilidad de un horario específico - SIMPLIFICADO
export async function verificarDisponibilidad(
  fecha: string,
  horario: string,
  personas: number
): Promise<{ disponible: boolean; lugaresDisponibles: number }> {
  try {
    const horarios = await obtenerHorariosDisponibles(fecha, personas)
    const horarioEncontrado = horarios.find(h => h.horario === horario)
    
    return {
      disponible: !!horarioEncontrado,
      lugaresDisponibles: horarioEncontrado?.lugares_disponibles || 0
    }
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error)
    return { disponible: false, lugaresDisponibles: 0 }
  }
}

// Crear reserva usando la función SQL
export async function crearReserva(reserva: Reserva) {
  try {
    const { data, error } = await supabase.rpc('crear_reserva', {
      p_fecha: reserva.fecha,
      p_horario: reserva.horario,
      p_personas: reserva.personas,
      p_nombre: reserva.nombre,
      p_email: reserva.email,
      p_telefono: reserva.telefono
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error al crear reserva:', error)
    throw error
  }
}

// Obtener todas las reservas (para admin)
export async function obtenerReservas() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .order('fecha', { ascending: true })
    .order('horario', { ascending: true })

  if (error) throw error
  return data
}

// Cancelar reserva (admin)
export async function cancelarReserva(id: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', id)

  if (error) throw error
}

// Obtener configuración
export async function obtenerConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Actualizar configuración (admin)
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