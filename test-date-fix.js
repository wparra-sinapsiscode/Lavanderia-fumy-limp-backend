/**
 * Test script para verificar la corrección del problema de fechas
 */

// Función helper normalizada
function normalizeDateForDB(dateString) {
  const targetDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = targetDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Función de consulta corregida
function createDateQuery(date) {
  const targetDate = date.includes('T') ? date.split('T')[0] : date;
  const [year, month, day] = targetDate.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  return { startDate, endDate };
}

console.log('🧪 TESTING FECHA NORMALIZADA Y CONSULTA CORREGIDA');
console.log('='.repeat(60));

// Simular creación de ruta para el 3 de junio
const userSelectedDate = '2025-06-03';
console.log(`\n📅 Usuario selecciona fecha: ${userSelectedDate}`);

// Simular cómo se almacenaría en la DB
const dbStoredDate = normalizeDateForDB(userSelectedDate);
console.log(`📀 Fecha almacenada en DB: ${dbStoredDate.toISOString()}`);
console.log(`📀 Día en UTC: ${dbStoredDate.getUTCDate()}`);

// Simular consulta de rutas para esa fecha
const { startDate, endDate } = createDateQuery(userSelectedDate);
console.log(`\n🔍 Consulta de rutas para: ${userSelectedDate}`);
console.log(`🔍 startDate: ${startDate.toISOString()}`);
console.log(`🔍 endDate: ${endDate.toISOString()}`);

// Verificar si la fecha almacenada está en el rango de consulta
const isInRange = dbStoredDate >= startDate && dbStoredDate < endDate;
console.log(`\n✅ ¿La fecha almacenada está en el rango? ${isInRange ? 'SÍ' : 'NO'}`);

// Probar con diferentes fechas
const testDates = ['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04'];

console.log('\n' + '='.repeat(60));
console.log('🧪 PRUEBA CON MÚLTIPLES FECHAS');

testDates.forEach(testDate => {
  console.log(`\n📅 Fecha: ${testDate}`);
  
  const stored = normalizeDateForDB(testDate);
  const query = createDateQuery(testDate);
  
  const inRange = stored >= query.startDate && stored < query.endDate;
  
  console.log(`  📀 Almacenada: ${stored.toISOString()}`);
  console.log(`  🔍 Consulta: ${query.startDate.toISOString()} - ${query.endDate.toISOString()}`);
  console.log(`  ✅ Coincide: ${inRange ? 'SÍ' : 'NO'}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ TODAS LAS FECHAS DEBERÍAN COINCIDIR CON ESTA SOLUCIÓN');