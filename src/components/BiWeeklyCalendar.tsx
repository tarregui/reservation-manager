import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BiWeeklyCalendarProps {
  personas: number;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  selectedDate: Date | null;
  selectedTime: string | null;
  fechaTieneDisponibilidad: (fecha: string, personas: number) => Promise<boolean>;
  obtenerHorariosDisponibles: (fecha: string, personas: number) => Promise<Array<{horario: string, lugares_disponibles: number}>>;
  className?: string;
}

interface DayInfo {
  date: Date;
  dateString: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isCurrentWeek: boolean;
}

const BiWeeklyCalendar: React.FC<BiWeeklyCalendarProps> = ({
  personas,
  onDateSelect,
  onTimeSelect,
  selectedDate,
  selectedTime,
  fechaTieneDisponibilidad,
  obtenerHorariosDisponibles,
  className = ''
}) => {
  const [currentStartDate, setCurrentStartDate] = useState<Date>(getMondayOfWeek(new Date()));
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [availableTimes, setAvailableTimes] = useState<Array<{horario: string, lugares_disponibles: number}>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Obtener el lunes de una semana específica
  function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // Generar las 2 semanas (14 días) desde el lunes actual
  const twoWeeks: DayInfo[] = useMemo(() => {
    const days: DayInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(currentStartDate);
      date.setDate(currentStartDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      days.push({
        date,
        dateString,
        dayNumber: date.getDate(),
        dayName: dayNames[date.getDay()],
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate?.toDateString() === date.toDateString(),
        isDisabled: unavailableDates.has(dateString) || date < today,
        isCurrentWeek: i < 7
      });
    }
    
    return days;
  }, [currentStartDate, unavailableDates, selectedDate]);

  // Cargar fechas sin disponibilidad - OPTIMIZADO
  useEffect(() => {
    const loadUnavailableDates = async () => {
      if (!personas) return;
      
      setLoading(true);
      const unavailable = new Set<string>();
      
      // CAMBIO: Solo verificar desde hoy hacia adelante (14 días)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startCheck = new Date(Math.max(currentStartDate.getTime(), today.getTime()));
      
      const promises = [];
      for (let i = 0; i < 14; i++) {
        const date = new Date(startCheck);
        date.setDate(startCheck.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        promises.push(
          fechaTieneDisponibilidad(dateString, personas)
            .then(hasAvailability => ({ dateString, hasAvailability }))
        );
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(({ dateString, hasAvailability }) => {
        if (!hasAvailability) {
          unavailable.add(dateString);
        }
      });
      
      setUnavailableDates(unavailable);
      setLoading(false);
    };
  
    loadUnavailableDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStartDate, personas]);

  
  // Cargar horarios cuando se selecciona una fecha
  useEffect(() => {
    const loadAvailableTimes = async () => {
      if (!selectedDate || !personas) {
        setAvailableTimes([]);
        return;
      }
      
      setLoadingTimes(true);
      try {
        const dateString = selectedDate.toISOString().split('T')[0];
        const times = await obtenerHorariosDisponibles(dateString, personas);
        setAvailableTimes(times);
      } catch (error) {
        console.error('Error loading times:', error);
        setAvailableTimes([]);
      } finally {
        setLoadingTimes(false);
      }
    };

    loadAvailableTimes();
  }, [selectedDate, personas, obtenerHorariosDisponibles]);

  // NUEVO: Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!personas) return;

    const channel = supabase
      .channel('reservas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas'
        },
        (payload) => {
          console.log('Cambio detectado en reservas:', payload);
          
          // Recargar disponibilidad
          const reloadDates = async () => {
            const unavailable = new Set<string>();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startCheck = new Date(Math.max(currentStartDate.getTime(), today.getTime()));
            
            const promises = [];
            for (let i = 0; i < 14; i++) {
              const date = new Date(startCheck);
              date.setDate(startCheck.getDate() + i);
              const dateString = date.toISOString().split('T')[0];
              
              promises.push(
                fechaTieneDisponibilidad(dateString, personas)
                  .then(hasAvailability => ({ dateString, hasAvailability }))
              );
            }
            
            const results = await Promise.all(promises);
            results.forEach(({ dateString, hasAvailability }) => {
              if (!hasAvailability) {
                unavailable.add(dateString);
              }
            });
            
            setUnavailableDates(unavailable);
            
            // Si la fecha seleccionada cambió, recargar horarios
            if (selectedDate) {
              const selectedDateStr = selectedDate.toISOString().split('T')[0];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const dateChanged = (payload.new as any)?.fecha === selectedDateStr || 
                                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                 (payload.old as any)?.fecha === selectedDateStr;
              
              if (dateChanged) {
                const times = await obtenerHorariosDisponibles(selectedDateStr, personas);
                setAvailableTimes(times);
              }
            }
          };
          
          reloadDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personas, currentStartDate, selectedDate]);

  // Navegar 2 semanas
  const goTwoWeeksBack = () => {
    const newDate = new Date(currentStartDate);
    newDate.setDate(newDate.getDate() - 14);
    setCurrentStartDate(newDate);
  };

  const goTwoWeeksForward = () => {
    const newDate = new Date(currentStartDate);
    newDate.setDate(newDate.getDate() + 14);
    setCurrentStartDate(newDate);
  };

  // Formatear horario sin segundos
  const formatTime = (time: string) => {
    const parts = time.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };

  // Formatear rango de fechas
  const dateRangeText = useMemo(() => {
    const firstDay = twoWeeks[0]?.date;
    const lastDay = twoWeeks[13]?.date;
    
    if (!firstDay || !lastDay) return '';
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const firstStr = firstDay.toLocaleDateString('es-AR', options);
    const lastStr = lastDay.toLocaleDateString('es-AR', { ...options, year: 'numeric' });
    
    return `${firstStr} - ${lastStr}`;
  }, [twoWeeks]);

  // Manejar selección de fecha
  const handleDateClick = (day: DayInfo) => {
    if (day.isDisabled || loading) return;
    onDateSelect(day.date);
    onTimeSelect('');
  };

  // Manejar selección de horario
  const handleTimeClick = (time: string) => {
    if (loadingTimes) return;
    onTimeSelect(time);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header con navegación */}
      <div className="bg-gray-50 rounded-t-xl p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={goTwoWeeksBack}
            className="p-2 hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50"
            disabled={loading}
            aria-label="2 semanas atrás"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <h3 className="text-base font-semibold text-gray-800 capitalize">
            {dateRangeText}
          </h3>
          
          <button
            onClick={goTwoWeeksForward}
            className="p-2 hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50"
            disabled={loading}
            aria-label="2 semanas adelante"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Calendario de 2 semanas */}
      <div className="bg-white p-4">
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 mt-2">Cargando disponibilidad...</p>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Primera semana */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Semana 1</p>
              <div className="grid grid-cols-7 gap-1">
                {twoWeeks.slice(0, 7).map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    disabled={day.isDisabled}
                    className={`
                      relative p-2 rounded-lg text-sm font-medium transition-all
                      ${day.isSelected 
                        ? 'bg-orange-500 text-white shadow-md scale-105' 
                        : day.isDisabled
                        ? 'bg-red-100 text-red-400 cursor-not-allowed opacity-60'
                        : 'bg-gray-50 text-gray-800 hover:bg-orange-100 hover:scale-105'
                      }
                      ${day.isToday ? 'ring-2 ring-orange-300' : ''}
                    `}
                    title={day.isDisabled ? 'No disponible' : day.dateString}
                  >
                    <div className="text-xs opacity-70">{day.dayName}</div>
                    <div className="text-lg font-bold">{day.dayNumber}</div>
                    {day.isToday && !day.isSelected && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Segunda semana */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Semana 2</p>
              <div className="grid grid-cols-7 gap-1">
                {twoWeeks.slice(7, 14).map((day, idx) => (
                  <button
                    key={idx + 7}
                    onClick={() => handleDateClick(day)}
                    disabled={day.isDisabled}
                    className={`
                      relative p-2 rounded-lg text-sm font-medium transition-all
                      ${day.isSelected 
                        ? 'bg-orange-500 text-white shadow-md scale-105' 
                        : day.isDisabled
                        ? 'bg-red-100 text-red-400 cursor-not-allowed opacity-60'
                        : 'bg-gray-50 text-gray-800 hover:bg-orange-100 hover:scale-105'
                      }
                      ${day.isToday ? 'ring-2 ring-orange-300' : ''}
                    `}
                    title={day.isDisabled ? 'No disponible' : day.dateString}
                  >
                    <div className="text-xs opacity-70">{day.dayName}</div>
                    <div className="text-lg font-bold">{day.dayNumber}</div>
                    {day.isToday && !day.isSelected && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Horarios disponibles */}
      {selectedDate && !loading && (
        <div className="bg-white border-t border-gray-200 p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Horarios disponibles ({availableTimes.length})
          </h4>

          {loadingTimes ? (
            <div className="text-center py-4">
              <div className="inline-block w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : availableTimes.length === 0 ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">
                No hay horarios disponibles para esta fecha con {personas} {personas === 1 ? 'persona' : 'personas'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {availableTimes.map(({ horario, lugares_disponibles }) => (
                <button
                  key={horario}
                  onClick={() => handleTimeClick(horario)}
                  className={`
                    p-2 rounded-lg text-xs font-medium transition-all
                    ${selectedTime === horario
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  title={`${lugares_disponibles} lugares disponibles`}
                >
                  <div className="font-semibold">{formatTime(horario)}</div>
                  <div className="text-[10px] opacity-70">{lugares_disponibles}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="bg-gray-50 rounded-b-xl p-3 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Seleccionado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
            <span>No disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-50 ring-2 ring-orange-300" />
            <span>Hoy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiWeeklyCalendar;