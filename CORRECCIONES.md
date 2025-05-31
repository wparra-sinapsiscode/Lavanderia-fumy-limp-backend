# Correcciones para el Backend

## Problemas identificados

1. **Problema con las rutas de servicios**:
   Las rutas especiales como `/services/my-services` y `/services/repartidor` se están confundiendo con la ruta para obtener un servicio por ID (`/services/:id`).

2. **Campo no existente en el modelo Hotel**:
   Se está intentando seleccionar el campo `contactPhone` en el modelo Hotel, pero este campo no existe en el esquema de Prisma.

## Soluciones

### 1. Corregir la definición de rutas

Archivo a modificar: `src/routes/service.routes.js`

Problema: Las rutas específicas como `/my-services` deben definirse ANTES de la ruta genérica `/:id` para evitar que sean interpretadas como un ID.

Cambio necesario:

```javascript
// Cambiar el orden de las rutas:

// ANTES:
router.get('/:id', authMiddleware, serviceController.getServiceById);
router.get('/my-services', authMiddleware, serviceController.getMyServices);

// DESPUÉS:
// Primero las rutas específicas
router.get('/my-services', authMiddleware, serviceController.getMyServices);
router.get('/repartidor', authMiddleware, serviceController.getMyServices); // Nueva ruta alternativa
// Luego la ruta genérica con parámetro
router.get('/:id', authMiddleware, serviceController.getServiceById);
```

### 2. Corregir el campo contactPhone

Archivo a modificar: `src/controllers/service.controller.js`

Problema: Se está utilizando un campo `contactPhone` que no existe en el modelo Hotel.

Cambio necesario:

```javascript
// ANTES:
const service = await prisma.service.findUnique({
  where: {
    id
  },
  include: {
    hotel: {
      select: {
        name: true,
        zone: true,
        contactPerson: true,
        contactPhone: true, // Este campo no existe
        // ...
      }
    },
    // ...
  }
});

// DESPUÉS:
const service = await prisma.service.findUnique({
  where: {
    id
  },
  include: {
    hotel: {
      select: {
        name: true,
        zone: true,
        contactPerson: true,
        phone: true, // Usar el campo correcto
        // ...
      }
    },
    // ...
  }
});
```

Busca todos los lugares donde se usa `contactPhone` y cámbialos por `phone`.

### 3. Crear un endpoint específico para repartidor

Archivo a modificar: `src/controllers/service.controller.js`

Para tener un endpoint dedicado para los repartidores:

```javascript
// Agregar un nuevo método o modificar el existente getMyServices
exports.getMyServices = async (req, res) => {
  try {
    const { userId, role, zone } = req.user;
    let filters = {};
    
    // Si es repartidor, filtrar por sus servicios asignados o por su zona
    if (role === 'REPARTIDOR') {
      filters = {
        OR: [
          { repartidorId: userId },
          { deliveryRepartidorId: userId },
          {
            AND: [
              { status: 'PENDING_PICKUP' },
              { hotel: { zone: zone } }
            ]
          }
        ]
      };
    }
    
    // Aplicar filtros adicionales de la consulta
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    const services = await prisma.service.findMany({
      where: filters,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true,
            phone: true,
            contactPerson: true
          }
        },
        repartidor: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Servicios obtenidos exitosamente',
      data: services
    });
  } catch (error) {
    console.error('Error getting my services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicios',
      error: error.message
    });
  }
};
```

## Pasos para implementar los cambios

1. **Cambiar el orden de las rutas en `service.routes.js`**
2. **Corregir todas las referencias a `contactPhone` en el código**
3. **Implementar o actualizar el método `getMyServices` para repartidores**

## Solución alternativa: Migración para agregar el campo contactPhone

Si prefieres mantener el campo `contactPhone` en lugar de cambiarlo en el código, puedes crear una migración para añadir el campo como un alias del campo `phone`:

1. Modificar el esquema en `prisma/schema.prisma`:

```prisma
model Hotel {
  id           String   @id @default(uuid())
  name         String
  address      String?
  zone         Zone
  phone        String?
  contactPhone String?  @map("phone") // Añadir este campo que mapea al mismo campo en la base de datos
  contactPerson String?
  // ... otros campos ...
}
```

2. Generar y aplicar la migración:

```bash
npx prisma migrate dev --name add_contact_phone_alias
```

Esta migración no modificará la estructura de la base de datos, solo el modelo de Prisma para que acepte ambos nombres de campo.

## Nota importante

Para evitar problemas en el futuro, siempre define las rutas específicas ANTES de las rutas genéricas con parámetros. Este es un patrón común en el desarrollo de APIs RESTful.