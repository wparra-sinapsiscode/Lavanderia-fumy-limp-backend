/**
 * Utilidades para manejo de fechas con zona horaria de Lima, Perú
 */

// Configurar la zona horaria por defecto
process.env.TZ = 'America/Lima';

/**
 * Obtiene la fecha/hora actual en Lima
 * @returns {Date} Fecha actual en Lima
 */
function getCurrentDateTimeLima() {
  return new Date();
}

/**
 * Crea una fecha para almacenar en BD que represente el momento actual en Lima
 * @returns {Date} Fecha para almacenar en BD
 */
function createLimaTimestamp() {
  // Para mantener consistencia con UTC pero representando tiempo de Lima
  return new Date();
}

/**
 * Convierte una fecha UTC a Lima
 * @param {Date|string} utcDate - Fecha en UTC
 * @returns {Date|null} Fecha convertida a Lima
 */
function utcToLima(utcDate) {
  if (!utcDate) return null;
  
  const date = new Date(utcDate);
  // Lima está UTC-5 (sin horario de verano)
  return new Date(date.toLocaleString("en-US", {timeZone: "America/Lima"}));
}

/**
 * Formatea una fecha para mostrar en la interfaz (formato peruano)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDateLima(date) {
  if (!date) return '';
  
  const options = {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return new Date(date).toLocaleString('es-PE', options);
}

/**
 * Formatea solo la fecha sin hora
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (DD/MM/YYYY)
 */
function formatDateOnly(date) {
  if (!date) return '';
  
  const options = {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('es-PE', options);
}

/**
 * Formatea solo la hora
 * @param {Date|string} date - Fecha de la cual extraer la hora
 * @returns {string} Hora formateada (HH:MM AM/PM)
 */
function formatTimeOnly(date) {
  if (!date) return '';
  
  const options = {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return new Date(date).toLocaleTimeString('es-PE', options);
}

/**
 * Obtiene el inicio del día en Lima (00:00:00)
 * @param {Date} date - Fecha base
 * @returns {Date} Inicio del día
 */
function getStartOfDayLima(date = new Date()) {
  const limaDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Lima"}));
  limaDate.setHours(0, 0, 0, 0);
  return limaDate;
}

/**
 * Obtiene el fin del día en Lima (23:59:59)
 * @param {Date} date - Fecha base
 * @returns {Date} Fin del día
 */
function getEndOfDayLima(date = new Date()) {
  const limaDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Lima"}));
  limaDate.setHours(23, 59, 59, 999);
  return limaDate;
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {Date} date1 - Primera fecha
 * @param {Date} date2 - Segunda fecha
 * @returns {number} Diferencia en días
 */
function getDaysDifference(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Agrega días a una fecha
 * @param {Date} date - Fecha base
 * @param {number} days - Días a agregar
 * @returns {Date} Nueva fecha
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = {
  getCurrentDateTimeLima,
  createLimaTimestamp,
  utcToLima,
  formatDateLima,
  formatDateOnly,
  formatTimeOnly,
  getStartOfDayLima,
  getEndOfDayLima,
  getDaysDifference,
  addDays
};