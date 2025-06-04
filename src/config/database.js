/**
 * Database configuration for Fumy Limp Backend
 */

const { PrismaClient } = require('@prisma/client');
const os = require('os');

// Verifica el host de conexión a PostgreSQL
function getPostgresConnectionInfo() {
  const dbUrl = process.env.DATABASE_URL || '';
  const hostname = os.hostname();
  
  // Si estamos en WSL, mostramos información adicional para la conexión
  if (os.release().toLowerCase().includes('microsoft') || os.release().toLowerCase().includes('wsl')) {
    console.log('Detectado entorno WSL. Información para conectar a PostgreSQL en Windows:');
    console.log(`  - Usando URL de conexión: ${dbUrl}`);
    console.log('  - Alternativas de conexión desde WSL a Windows PostgreSQL:');
    console.log('    * localhost (si PostgreSQL acepta conexiones TCP/IP)');
    console.log('    * host.docker.internal (común en entornos WSL)');
    console.log(`    * ${hostname}.local (nombre de host WSL)`);
    console.log('    * La dirección IP de Windows (generalmente 192.168.x.x)');
  }
  
  return { dbUrl, isWSL: os.release().toLowerCase().includes('microsoft') || os.release().toLowerCase().includes('wsl') };
}

// Obtener información de conexión
getPostgresConnectionInfo();

// Create Prisma Client instance with logging options
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error']
});

// Initialize database connection
async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Configurar la zona horaria para esta sesión
    try {
      await prisma.$executeRaw`SET TIMEZONE TO 'America/Lima'`;
      console.log('✅ Timezone set to America/Lima for this session');
      
      // Verificar la configuración de timezone
      const timezoneResult = await prisma.$queryRaw`SELECT current_setting('TIMEZONE') as timezone`;
      console.log('✅ Current session timezone:', timezoneResult[0].timezone);
      
      // Mostrar la hora actual del servidor
      const timeResult = await prisma.$queryRaw`
        SELECT 
          CURRENT_TIMESTAMP as server_time,
          CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima' as lima_time
      `;
      console.log('✅ Server time:', timeResult[0].server_time);
      console.log('✅ Lima time:', timeResult[0].lima_time);
    } catch (tzError) {
      console.warn('⚠️ Could not set timezone:', tzError.message);
    }
    
    // Verificar la conexión ejecutando una consulta simple
    const testResult = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Database query test successful');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // Proporcionar sugerencias para solucionar problemas de conexión
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('Sugerencias para solucionar problemas de conexión:');
      console.error('1. Verifique que PostgreSQL está en ejecución en Windows');
      console.error('2. Verifique que PostgreSQL acepta conexiones TCP/IP (postgresql.conf)');
      console.error('3. Verifique que el usuario y contraseña son correctos');
      console.error('4. Verifique que el firewall de Windows permite conexiones al puerto 5432');
      console.error('5. En pgAdmin, verifique que en el servidor:');
      console.error('   - Connection > Host: localhost o 127.0.0.1');
      console.error('   - Connection > Port: 5432');
      console.error('   - Connection > Maintenance Database: fumylimp_db');
      console.error('   - Connection > Username: postgres');
      console.error('6. Intente modificar la URL de conexión en .env:');
      console.error('   - Cambie "localhost" por "host.docker.internal" o viceversa');
    }
    
    return false;
  }
}

// Gracefully disconnect from database
async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    return true;
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    return false;
  }
}

module.exports = {
  prisma,
  connectToDatabase,
  disconnectFromDatabase
};