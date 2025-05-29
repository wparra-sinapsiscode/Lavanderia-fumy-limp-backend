/**
 * Script para limpiar todos los datos de la base de datos
 * Mantiene la estructura de la base de datos pero elimina todos los registros
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🚫 Eliminando todos los datos de la base de datos...');
  
  try {
    // Eliminar datos en orden para respetar las restricciones de clave foránea
    
    // 1. Eliminar registros de auditoría
    await prisma.auditLog.deleteMany({});
    console.log('✅ Logs de auditoría eliminados');
    
    // 2. Eliminar transacciones
    await prisma.transaction.deleteMany({});
    console.log('✅ Transacciones eliminadas');
    
    // 3. Eliminar rótulos de bolsas
    await prisma.bagLabel.deleteMany({});
    console.log('✅ Rótulos de bolsas eliminados');
    
    // 4. Eliminar servicios
    await prisma.service.deleteMany({});
    console.log('✅ Servicios eliminados');
    
    // 5. Eliminar huéspedes (si existe esta tabla)
    try {
      await prisma.guest.deleteMany({});
      console.log('✅ Huéspedes eliminados');
    } catch (e) {
      console.log('ℹ️ Tabla de huéspedes no encontrada o ya vacía');
    }
    
    // 6. Eliminar tokens revocados
    await prisma.revokedToken.deleteMany({});
    console.log('✅ Tokens revocados eliminados');
    
    // 7. Eliminar configuración del sistema
    await prisma.systemConfig.deleteMany({});
    console.log('✅ Configuración del sistema eliminada');
    
    // 8. Eliminar hoteles
    await prisma.hotel.deleteMany({});
    console.log('✅ Hoteles eliminados');
    
    // 9. Eliminar usuarios (excepto admin por seguridad)
    await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });
    console.log('✅ Usuarios eliminados (excepto admin)');
    
    console.log('🎉 Base de datos limpiada exitosamente');
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });