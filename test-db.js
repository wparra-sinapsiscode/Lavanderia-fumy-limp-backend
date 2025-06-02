/**
 * Test de conexión a la base de datos PostgreSQL
 * 
 * Este script verifica la conexión a la base de datos y muestra información
 * detallada de cualquier problema que encuentre.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const os = require('os');

// Información del entorno
console.log('=== Información del Entorno ===');
console.log(`Sistema: ${os.platform()} (${os.release()})`);
console.log(`Node.js: ${process.version}`);
console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// Verificar variable DATABASE_URL
console.log('=== Configuración de Base de Datos ===');
const dbUrlSafe = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@') // Ocultar contraseña
  : 'No definida';
console.log(`DATABASE_URL: ${dbUrlSafe}`);

// Analizar la URL de conexión
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`Protocolo: ${url.protocol}`);
    console.log(`Usuario: ${url.username}`);
    console.log(`Host: ${url.hostname}`);
    console.log(`Puerto: ${url.port}`);
    console.log(`Ruta: ${url.pathname}`);
    console.log(`Parámetros: ${url.search}`);
  } catch (e) {
    console.error('Error al analizar la URL de conexión:', e.message);
  }
}
console.log('');

// Detectar si estamos en WSL
const isWSL = os.release().toLowerCase().includes('microsoft') || 
              os.release().toLowerCase().includes('wsl');

if (isWSL) {
  console.log('=== Detectado entorno WSL ===');
  console.log('Opciones de conexión desde WSL a PostgreSQL en Windows:');
  console.log('1. localhost - Si PostgreSQL acepta conexiones locales TCP/IP');
  console.log('2. host.docker.internal - Común en entornos WSL/Docker');
  console.log(`3. ${os.hostname()}.local - Nombre de host WSL`);
  console.log('4. La dirección IP de Windows (generalmente 192.168.x.x)');
  console.log('');
}

// Crear cliente Prisma con logging detallado
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

// Probar conexión
async function testConnection() {
  console.log('=== Probando Conexión a la Base de Datos ===');
  console.log('Intentando conectar...');
  
  try {
    // Conectar a la base de datos
    console.log('Estableciendo conexión...');
    await prisma.$connect();
    console.log('✅ Conexión establecida correctamente');
    
    // Ejecutar consulta simple
    console.log('Ejecutando consulta de prueba...');
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log(`✅ Consulta exitosa. Resultado: ${JSON.stringify(result)}`);
    
    // Verificar tablas existentes
    console.log('Obteniendo información del esquema...');
    try {
      // Intenta obtener un hotel para verificar la estructura
      const hotelCount = await prisma.hotel.count();
      console.log(`✅ Tabla Hotel existe con ${hotelCount} registros`);
      
      // Intenta obtener un servicio para verificar la estructura
      const serviceCount = await prisma.service.count();
      console.log(`✅ Tabla Service existe con ${serviceCount} registros`);
      
      // Intenta obtener un usuario para verificar la estructura
      const userCount = await prisma.user.count();
      console.log(`✅ Tabla User existe con ${userCount} registros`);
      
      // Intenta obtener una ruta para verificar la estructura
      const routeCount = await prisma.route.count();
      console.log(`✅ Tabla Route existe con ${routeCount} registros`);
      
      // Intenta obtener una parada de ruta para verificar la estructura
      const routeStopCount = await prisma.routeStop.count();
      console.log(`✅ Tabla RouteStop existe con ${routeStopCount} registros`);
      
    } catch (schemaError) {
      console.error('❌ Error al verificar el esquema de la base de datos:', schemaError);
    }
    
    console.log('');
    console.log('RESULTADO: La conexión a la base de datos funciona correctamente.');
    
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:');
    console.error(error);
    
    // Análisis detallado del error
    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n=== DIAGNÓSTICO ===');
      console.log('El servidor PostgreSQL rechazó la conexión. Posibles causas:');
      console.log('1. PostgreSQL no está en ejecución');
      console.log('2. PostgreSQL no está escuchando en el host/puerto especificado');
      console.log('3. Un firewall está bloqueando la conexión');
      
      if (isWSL) {
        console.log('\nSi estás en WSL intentando conectar a PostgreSQL en Windows:');
        console.log('- Intenta cambiar "localhost" por "host.docker.internal" en DATABASE_URL');
        console.log('- Verifica que PostgreSQL en Windows acepta conexiones TCP/IP (postgresql.conf)');
        console.log('- Verifica que pg_hba.conf permite conexiones desde hosts remotos');
      }
    } else if (error.message.includes('authentication failed')) {
      console.log('\n=== DIAGNÓSTICO ===');
      console.log('Error de autenticación. Posibles causas:');
      console.log('1. El nombre de usuario es incorrecto');
      console.log('2. La contraseña es incorrecta');
      console.log('3. El método de autenticación no es compatible');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n=== DIAGNÓSTICO ===');
      console.log('La base de datos especificada no existe. Posibles soluciones:');
      console.log('1. Crear la base de datos con: CREATE DATABASE fumylimp_db;');
      console.log('2. Verificar el nombre de la base de datos en DATABASE_URL');
    }
    
    console.log('\n=== SUGERENCIAS DE SOLUCIÓN ===');
    console.log('1. Verifica que PostgreSQL está en ejecución');
    console.log('2. Verifica las credenciales en el archivo .env');
    console.log('3. Intenta conectarte manualmente con: psql -h [host] -U [usuario] -d [base_de_datos]');
    console.log('4. Revisa los logs de PostgreSQL para obtener más detalles sobre el error');
    
    console.log('\nRESULTADO: La conexión a la base de datos falló. Revisa las sugerencias anteriores.');
  } finally {
    // Desconectar
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testConnection()
  .catch(e => {
    console.error('Error inesperado:', e);
    process.exit(1);
  });