const axios = require('axios');
const colors = require('colors');

const API_URL = 'http://localhost:3000/api';

async function verifySystem() {
  console.log('🔍 Verificando Sistema Fumy Limp...\n'.blue);
  
  const tests = {
    backend: false,
    database: false,
    auth: false,
    hotels: false,
    services: false,
    frontend: false
  };
  
  // 1. Verificar Backend
  try {
    await axios.get(`${API_URL}/health`);
    tests.backend = true;
    console.log('✅ Backend funcionando'.green);
  } catch (error) {
    console.log('❌ Backend no responde'.red);
    console.log('   Ejecuta: cd fumy-limp-backend && npm run dev\n'.yellow);
  }
  
  // 2. Verificar Auth
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@fumylimp.com',
      password: 'admin123'
    });
    tests.auth = true;
    tests.database = true;
    console.log('✅ Autenticación funcionando'.green);
    console.log('✅ Base de datos conectada'.green);
    
    const token = loginRes.data.accessToken;
    
    // 3. Verificar Hotels
    try {
      const hotelsRes = await axios.get(`${API_URL}/hotels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      tests.hotels = hotelsRes.data.data.length > 0;
      console.log(`✅ Hotels: ${hotelsRes.data.data.length} encontrados`.green);
    } catch (error) {
      console.log('❌ Error al obtener hotels'.red);
    }
    
    // 4. Verificar Services
    try {
      const servicesRes = await axios.get(`${API_URL}/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      tests.services = true;
      console.log(`✅ Services: ${servicesRes.data.data.length} encontrados`.green);
    } catch (error) {
      console.log('❌ Error al obtener services'.red);
    }
    
  } catch (error) {
    console.log('❌ Error de autenticación'.red);
    console.log('   Verifica que hayas ejecutado: npx prisma db seed\n'.yellow);
  }
  
  // 5. Verificar Frontend
  try {
    await axios.get('http://localhost:5173');
    tests.frontend = true;
    console.log('✅ Frontend funcionando'.green);
  } catch (error) {
    console.log('❌ Frontend no responde'.red);
    console.log('   Ejecuta: cd Lavanderia && npm run dev\n'.yellow);
  }
  
  // Resumen
  console.log('\n📊 RESUMEN:'.blue);
  const passed = Object.values(tests).filter(t => t).length;
  const total = Object.keys(tests).length;
  
  if (passed === total) {
    console.log('✅ Sistema completamente funcional!'.green.bold);
    console.log('\n🚀 Puedes empezar a usar Fumy Limp en:'.blue);
    console.log('   http://localhost:5173'.cyan);
  } else {
    console.log(`⚠️  ${passed}/${total} componentes funcionando`.yellow);
    console.log('\nRevisa los errores arriba para completar la instalación'.yellow);
  }
}

// Ejecutar verificación
verifySystem().catch(console.error);