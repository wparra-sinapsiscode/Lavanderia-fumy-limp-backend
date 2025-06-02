/**
 * Script para probar diferentes configuraciones de conexión a PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// URLs de conexión a probar
const connectionURLs = [
  // Conexión estándar (localhost)
  "postgresql://postgres:1234@localhost:5432/fumylimp_db?schema=public",
  
  // Usando IP de Windows
  "postgresql://postgres:1234@172.21.160.1:5432/fumylimp_db?schema=public",
  
  // Usando host.docker.internal (común en WSL)
  "postgresql://postgres:1234@host.docker.internal:5432/fumylimp_db?schema=public",
  
  // Usando el IP específico del host de Windows
  "postgresql://postgres:1234@172.21.160.1:5432/fumylimp_db?schema=public",
  
  // Usando 127.0.0.1 explícitamente
  "postgresql://postgres:1234@127.0.0.1:5432/fumylimp_db?schema=public"
];

// Función para probar la conexión
async function testConnection(url) {
  console.log(`\nProbando conexión con: ${url}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });
  
  try {
    // Intentar conectarse
    await prisma.$connect();
    console.log('✅ Conexión exitosa');
    
    // Ejecutar consulta de prueba
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Consulta de prueba exitosa:', result);
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Probar todas las conexiones
async function testAllConnections() {
  console.log('=== PROBANDO CONEXIONES A POSTGRESQL ===');
  
  // Mostrar información del entorno
  console.log('DATABASE_URL del .env:', process.env.DATABASE_URL);
  
  for (const url of connectionURLs) {
    await testConnection(url);
  }
}

testAllConnections()
  .then(() => {
    console.log('\n=== PRUEBAS COMPLETADAS ===');
  })
  .catch(error => {
    console.error('Error ejecutando las pruebas:', error);
  });