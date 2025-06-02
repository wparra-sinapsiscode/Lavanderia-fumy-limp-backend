# API de Gestión de Rutas - Fumy Limp

## Descripción

Este módulo proporciona endpoints para la generación y gestión de rutas de recogida y entrega en la aplicación Fumy Limp. Permite crear, actualizar, eliminar y optimizar rutas, así como gestionar las paradas incluidas en cada ruta.

## Modelos de Datos

### Route

```prisma
model Route {
  id              String       @id @default(uuid())
  name            String
  date            DateTime
  repartidorId    String
  status          RouteStatus  @default(PLANNED)
  startTime       DateTime?
  endTime         DateTime?
  totalDistance   Float?       // en kilómetros
  notes           String?      @db.Text
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relaciones
  repartidor      User         @relation(fields: [repartidorId], references: [id])
  stops           RouteStop[]
}
```

### RouteStop

```prisma
model RouteStop {
  id              String    @id @default(uuid())
  routeId         String
  serviceId       String?
  hotelId         String
  order           Int
  status          String    @default("PENDING")  // PENDING, COMPLETED, SKIPPED
  scheduledTime   DateTime?
  actualTime      DateTime?
  notes           String?   @db.Text
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relaciones
  route           Route     @relation(fields: [routeId], references: [id], onDelete: Cascade)
  hotel           Hotel     @relation(fields: [hotelId], references: [id])
  service         Service?  @relation(fields: [serviceId], references: [id])
}
```

### RouteStatus (Enumeración)

```prisma
enum RouteStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

## Endpoints

### Crear una ruta

- **URL**: `/api/routes`
- **Método**: `POST`
- **Autenticación**: Requiere token válido
- **Payload**:
  ```json
  {
    "name": "Ruta Norte 15/06/2025",
    "date": "2025-06-15T08:00:00Z",
    "repartidorId": "uuid-repartidor",
    "notes": "Ruta de recogida matutina",
    "stops": [
      {
        "hotelId": "uuid-hotel-1",
        "serviceId": "uuid-service-1",
        "scheduledTime": "2025-06-15T09:00:00Z",
        "notes": "Recogida urgente"
      },
      {
        "hotelId": "uuid-hotel-2",
        "serviceId": "uuid-service-2",
        "scheduledTime": "2025-06-15T10:30:00Z"
      }
    ]
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Ruta creada exitosamente",
    "data": {
      "route": { ... },
      "stops": [ ... ]
    }
  }
  ```

### Obtener todas las rutas

- **URL**: `/api/routes`
- **Método**: `GET`
- **Autenticación**: Requiere token válido
- **Parámetros opcionales de consulta**:
  - `repartidorId`: Filtrar por repartidor
  - `date`: Filtrar por fecha específica (YYYY-MM-DD)
  - `status`: Filtrar por estado (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
  - `startDate` y `endDate`: Rango de fechas
  - `includeStops`: 'true' para incluir las paradas en la respuesta
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [ ... ]
  }
  ```

### Obtener una ruta por ID

- **URL**: `/api/routes/:id`
- **Método**: `GET`
- **Autenticación**: Requiere token válido
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-route",
      "name": "Ruta Norte 15/06/2025",
      "date": "2025-06-15T08:00:00Z",
      "repartidorId": "uuid-repartidor",
      "status": "PLANNED",
      "stops": [ ... ],
      "repartidor": { ... }
    }
  }
  ```

### Actualizar una ruta

- **URL**: `/api/routes/:id`
- **Método**: `PUT`
- **Autenticación**: Requiere token válido
- **Payload** (todos los campos son opcionales):
  ```json
  {
    "name": "Ruta Norte Actualizada",
    "date": "2025-06-16T08:00:00Z",
    "repartidorId": "uuid-nuevo-repartidor",
    "status": "IN_PROGRESS",
    "notes": "Notas actualizadas",
    "startTime": "2025-06-16T08:30:00Z",
    "endTime": "2025-06-16T14:30:00Z",
    "totalDistance": 45.7
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Ruta actualizada exitosamente",
    "data": { ... }
  }
  ```

### Actualizar el estado de una ruta

- **URL**: `/api/routes/:id/status`
- **Método**: `PATCH`
- **Autenticación**: Requiere token válido
- **Payload**:
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Estado de la ruta actualizado exitosamente",
    "data": { ... }
  }
  ```

### Generar una ruta recomendada

- **URL**: `/api/routes/recommended`
- **Método**: `POST`
- **Autenticación**: Requiere token válido
- **Payload**:
  ```json
  {
    "repartidorId": "uuid-repartidor",
    "date": "2025-06-16",
    "zone": "NORTE",
    "type": "mixed"
  }
  ```
  Donde `type` puede ser: "pickup", "delivery" o "mixed" (por defecto)
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Ruta recomendada generada exitosamente",
    "data": {
      "route": { ... },
      "stops": [ ... ],
      "serviceCount": 8
    }
  }
  ```

### Optimizar una ruta

- **URL**: `/api/routes/:id/optimize`
- **Método**: `POST`
- **Autenticación**: Requiere token válido
- **Payload** (opcional):
  ```json
  {
    "startLatitude": -12.0464,
    "startLongitude": -77.0428
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Ruta optimizada exitosamente",
    "data": {
      "id": "uuid-route",
      "totalDistance": 35.6,
      "stops": [ ... ]
    }
  }
  ```

### Agregar una parada a una ruta

- **URL**: `/api/routes/:id/stops`
- **Método**: `POST`
- **Autenticación**: Requiere token válido
- **Payload**:
  ```json
  {
    "hotelId": "uuid-hotel",
    "serviceId": "uuid-service",
    "scheduledTime": "2025-06-15T11:30:00Z",
    "notes": "Parada adicional"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Parada agregada exitosamente",
    "data": { ... }
  }
  ```

### Actualizar una parada

- **URL**: `/api/routes/:routeId/stops/:stopId`
- **Método**: `PUT`
- **Autenticación**: Requiere token válido
- **Payload** (todos los campos son opcionales):
  ```json
  {
    "hotelId": "uuid-nuevo-hotel",
    "serviceId": "uuid-nuevo-service",
    "order": 3,
    "status": "COMPLETED",
    "scheduledTime": "2025-06-15T12:00:00Z",
    "actualTime": "2025-06-15T12:15:00Z",
    "notes": "Notas actualizadas"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Parada actualizada exitosamente",
    "data": { ... }
  }
  ```

### Eliminar una parada

- **URL**: `/api/routes/:routeId/stops/:stopId`
- **Método**: `DELETE`
- **Autenticación**: Requiere token válido
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Parada eliminada exitosamente"
  }
  ```

### Eliminar una ruta

- **URL**: `/api/routes/:id`
- **Método**: `DELETE`
- **Autenticación**: Requiere token válido y rol de administrador
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Ruta eliminada exitosamente"
  }
  ```

## Notas sobre la implementación

1. **Optimización de rutas**: Se utiliza un algoritmo básico del vecino más cercano para optimizar el orden de las paradas. Esto minimiza la distancia total recorrida.

2. **Generación automática de rutas**: La función `generateRecommendedRoute` crea automáticamente rutas basadas en servicios pendientes, priorizando por:
   - Prioridad del servicio (ALTA, MEDIA, NORMAL)
   - Tipo de servicio (recogida, entrega o mixto)
   - Zona geográfica

3. **Cálculo de distancias**: Se utiliza la fórmula de Haversine para calcular distancias entre coordenadas geográficas, teniendo en cuenta la curvatura de la Tierra.

4. **Manejo de estados**: La actualización del estado de una ruta actualiza automáticamente los campos relevantes:
   - Al cambiar a IN_PROGRESS, se establece startTime si no existe
   - Al cambiar a COMPLETED, se establece endTime si no existe