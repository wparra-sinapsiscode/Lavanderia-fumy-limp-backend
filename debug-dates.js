/**
 * Script para debuggear el problema de desfase de fechas
 */

console.log('🔍 ANÁLISIS DEL PROBLEMA DE FECHAS - BACKEND');
console.log('='.repeat(60));

// Simular lo que hace el frontend
function simulateFrontend() {
    console.log('\n📱 FRONTEND - Generación de selectedDate:');
    
    // Simular la inicialización del selectedDate
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const selectedDate = `${year}-${month}-${day}`;
    
    console.log('  now (Date actual):', now.toString());
    console.log('  now.getDate():', now.getDate());
    console.log('  selectedDate generado:', selectedDate);
    
    // Simular el input date value cuando el usuario selecciona día 3
    const userSelectedDate = '2025-06-03'; // Usuario selecciona 3 de junio
    console.log('\n📅 Usuario selecciona fecha:', userSelectedDate);
    
    return userSelectedDate;
}

// Simular lo que hace el backend
function simulateBackend(date) {
    console.log('\n🖥️ BACKEND - Procesamiento de fecha recibida:');
    console.log('  Fecha recibida del frontend:', date);
    console.log('  Tipo:', typeof date);
    
    // Procesar fecha como lo hace el backend
    const targetDate = date.includes('T') ? date.split('T')[0] : date;
    console.log('  targetDate procesado:', targetDate);
    
    // Crear fechas como lo hace el backend actual
    const startDate = new Date(targetDate + 'T00:00:00');
    const endDate = new Date(targetDate + 'T23:59:59.999');
    
    console.log('  startDate:', startDate.toISOString());
    console.log('  endDate:', endDate.toISOString());
    console.log('  startDate (local):', startDate.toLocaleString('es-PE'));
    console.log('  endDate (local):', endDate.toLocaleString('es-PE'));
    
    // Analizar el problema
    console.log('\n🔍 ANÁLISIS DEL PROBLEMA:');
    const startDateUTC = new Date(startDate.toISOString());
    const endDateUTC = new Date(endDate.toISOString());
    
    console.log('  startDate UTC:', startDateUTC.toISOString());
    console.log('  startDate UTC día:', startDateUTC.getUTCDate());
    console.log('  startDate local día:', startDate.getDate());
    
    // Simular lo que debería pasar en la base de datos
    console.log('\n💾 CONSULTA A BASE DE DATOS:');
    console.log('  WHERE date >= ', startDate.toISOString());
    console.log('  WHERE date < ', endDate.toISOString());
    
    // ¿Cuál es el día que realmente se consulta?
    const consultedDay = startDate.getUTCDate();
    const expectedDay = parseInt(targetDate.split('-')[2]);
    
    console.log('  Día esperado por el usuario:', expectedDay);
    console.log('  Día que se consulta en UTC:', consultedDay);
    console.log('  ¿Hay desfase?', consultedDay !== expectedDay ? '🚨 SÍ' : '✅ NO');
    
    return { consultedDay, expectedDay, hasOffset: consultedDay !== expectedDay };
}

// Probar diferentes escenarios
console.log('\n🧪 PRUEBAS DE ESCENARIOS:');

// Escenario 1: Usuario selecciona día 3
const userDate1 = '2025-06-03';
const result1 = simulateBackend(userDate1);

console.log('\n' + '-'.repeat(60));

// Escenario 2: Usuario selecciona día 2
const userDate2 = '2025-06-02';
const result2 = simulateBackend(userDate2);

console.log('\n' + '-'.repeat(60));

// Propuesta de solución
console.log('\n💡 PROPUESTA DE SOLUCIÓN:');
console.log('El problema está en cómo se construyen las fechas startDate y endDate.');
console.log('Al usar new Date(targetDate + "T00:00:00"), JavaScript interpreta');
console.log('la fecha en la zona horaria local, pero Prisma la convierte a UTC.');
console.log('\nSolución propuesta:');
console.log('1. Usar fechas explícitamente en UTC');
console.log('2. O usar Date.UTC() para evitar conversiones de zona horaria');

function proposedSolution(date) {
    console.log('\n🔧 SOLUCIÓN PROPUESTA - Procesamiento de fecha:');
    console.log('  Fecha recibida:', date);
    
    const targetDate = date.includes('T') ? date.split('T')[0] : date;
    console.log('  targetDate:', targetDate);
    
    // Solución: Usar UTC explícitamente
    const [year, month, day] = targetDate.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    
    console.log('  startDate (UTC):', startDate.toISOString());
    console.log('  endDate (UTC):', endDate.toISOString());
    console.log('  startDate día UTC:', startDate.getUTCDate());
    console.log('  endDate día UTC:', endDate.getUTCDate());
    console.log('  ¿Día correcto?', startDate.getUTCDate() === day ? '✅ SÍ' : '🚨 NO');
    
    return { startDate, endDate };
}

proposedSolution('2025-06-03');