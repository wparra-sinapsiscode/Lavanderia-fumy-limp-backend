/**
 * Test del sistema de rutas de Fumy Limp
 * 
 * Este script verifica específicamente la generación de rutas
 * y la conexión del backend con la base de datos.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const app = require('./src/app');
const request = require('supertest');

// Crear cliente Prisma
const prisma = new PrismaClient({
  log: ['error']
});

// Función principal para probar el sistema de rutas
async function testRouteSystem() {
  console.log('=== TEST DEL SISTEMA DE RUTAS ===\n');
  
  // 1. Verificar conexión a la base de datos
  await testDatabaseConnection();
  
  // 2. Verificar el controlador de rutas
  await testRouteController();
  
  // 3. Verificar la API de rutas
  await testRouteAPI();
  
  console.log('\n=== VERIFICACIÓN COMPLETA ===');
}

// Prueba la conexión a la base de datos
async function testDatabaseConnection() {
  console.log('=== Verificando conexión a la base de datos ===');
  
  try {
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Verificar tablas principales
    const hoteles = await prisma.hotel.count();
    console.log(`✅ ${hoteles} hoteles encontrados en la base de datos`);
    
    const servicios = await prisma.service.count();
    console.log(`✅ ${servicios} servicios encontrados en la base de datos`);
    
    const rutas = await prisma.route.count();
    console.log(`✅ ${rutas} rutas encontradas en la base de datos`);
    
    const usuarios = await prisma.user.count();
    console.log(`✅ ${usuarios} usuarios encontrados en la base de datos`);
    
    // Verificar repartidores
    const repartidores = await prisma.user.count({
      where: { role: 'REPARTIDOR' }
    });
    
    if (repartidores === 0) {
      console.log('❌ No hay usuarios con rol REPARTIDOR. La generación de rutas fallará.');
    } else {
      console.log(`✅ ${repartidores} repartidores encontrados`);
    }
    
    // Verificar servicios pendientes
    const pendientes = await prisma.service.count({
      where: { status: 'PENDING_PICKUP' }
    });
    
    const entregas = await prisma.service.count({
      where: { status: 'IN_PROCESS' }
    });
    
    if (pendientes === 0 && entregas === 0) {
      console.log('❌ No hay servicios pendientes. La generación de rutas no tendrá qué asignar.');
    } else {
      console.log(`✅ ${pendientes} servicios pendientes de recogida y ${entregas} servicios para entrega`);
    }
    
  } catch (error) {
    console.log('❌ Error de conexión a la base de datos:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('');
}

// Prueba directamente el controlador de rutas
async function testRouteController() {
  console.log('=== Verificando controlador de rutas ===');
  
  try {
    // Importar el controlador
    const routeController = require('./src/controllers/route.controller');
    
    // Verificar que tenga las funciones principales
    if (typeof routeController.getRoutes !== 'function') {
      console.log('❌ Función getRoutes no encontrada en el controlador');
    } else {
      console.log('✅ Función getRoutes verificada');
    }
    
    if (typeof routeController.generateRecommendedRoute !== 'function') {
      console.log('❌ Función generateRecommendedRoute no encontrada en el controlador');
    } else {
      console.log('✅ Función generateRecommendedRoute verificada');
    }
    
    if (typeof routeController.startRoute !== 'function') {
      console.log('❌ Función startRoute no encontrada en el controlador');
    } else {
      console.log('✅ Función startRoute verificada');
    }
    
    if (typeof routeController.deleteRoutesByDate !== 'function') {
      console.log('❌ Función deleteRoutesByDate no encontrada en el controlador');
    } else {
      console.log('✅ Función deleteRoutesByDate verificada');
    }
    
  } catch (error) {
    console.log('❌ Error al verificar el controlador de rutas:');
    console.error(error);
  }
  
  console.log('');
}

// Prueba la API de rutas con peticiones HTTP simuladas
async function testRouteAPI() {
  console.log('=== Verificando API de rutas ===');
  
  try {
    // Primero necesitamos autenticarnos
    console.log('Intentando autenticación...');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    
    if (!loginRes.body.token) {
      console.log('❌ Autenticación fallida. No se pudo obtener token.');
      console.log('   Verifica las credenciales o si el usuario admin existe.');
      return;
    }
    
    const token = loginRes.body.token;
    console.log('✅ Autenticación exitosa');
    
    // Probar obtener rutas
    console.log('Intentando obtener rutas...');
    const getRoutesRes = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${token}`);
    
    if (getRoutesRes.status === 200) {
      console.log(`✅ API GET /routes funciona. ${getRoutesRes.body.data?.length || 0} rutas encontradas.`);
    } else if (getRoutesRes.status === 503) {
      console.log('❌ Error 503 al obtener rutas: Problema de conexión a la base de datos');
      console.log('   Verifica que la base de datos esté en ejecución y correctamente configurada en .env');
    } else {
      console.log(`❌ Error ${getRoutesRes.status} al obtener rutas`);
    }
    
    // Probar generar ruta
    console.log('Intentando generar ruta...');
    const todayDate = new Date().toISOString().split('T')[0];
    
    const generateRes = await request(app)
      .post('/api/routes/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: todayDate });
    
    if (generateRes.status === 201) {
      console.log('✅ API POST /routes/generate funciona. Ruta generada exitosamente.');
    } else if (generateRes.status === 503) {
      console.log('❌ Error 503 al generar ruta: Problema de conexión a la base de datos');
    } else {
      console.log(`❌ Error ${generateRes.status} al generar ruta: ${generateRes.body.message || 'Error desconocido'}`);
    }
    
  } catch (error) {
    console.log('❌ Error al verificar la API de rutas:');
    console.error(error);
  }
  
  console.log('');
}

// Ejecutar las pruebas
testRouteSystem()
  .catch(e => {
    console.error('Error inesperado:', e);
    process.exit(1);
  });