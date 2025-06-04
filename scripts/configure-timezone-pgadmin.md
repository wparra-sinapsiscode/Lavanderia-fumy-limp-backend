# Configuración de Zona Horaria en PostgreSQL

Como estás usando WSL y PostgreSQL está en Windows, sigue estos pasos:

## 1. Verificar la zona horaria actual en pgAdmin

Abre pgAdmin y ejecuta estas consultas en tu base de datos `fumylimp_db`:

```sql
-- Ver la zona horaria actual
SHOW TIMEZONE;

-- Ver la hora actual del servidor
SELECT 
    CURRENT_TIMESTAMP as hora_servidor,
    CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima' as hora_lima,
    CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as hora_utc;

-- Ver zonas horarias disponibles para Perú
SELECT * FROM pg_timezone_names 
WHERE name LIKE '%Lima%' 
ORDER BY name;
```

## 2. Configurar la zona horaria para tu base de datos

Si la zona horaria NO es 'America/Lima', ejecuta:

```sql
-- IMPORTANTE: Ejecuta esto como superusuario (postgres)
ALTER DATABASE fumylimp_db SET TIMEZONE TO 'America/Lima';
```

**Nota:** Después de ejecutar ALTER DATABASE, necesitas:
1. Desconectarte de la base de datos
2. Volver a conectarte para que tome efecto

## 3. Verificar que el cambio se aplicó

Después de reconectarte, ejecuta:

```sql
-- Verificar que el cambio se aplicó
SHOW TIMEZONE;

-- Debería mostrar: America/Lima
```

## 4. Verificar registros existentes

Para ver cómo se muestran las fechas actuales:

```sql
-- Ver algunos registros con sus fechas
SELECT 
    id, 
    username,
    "createdAt",
    "createdAt" AT TIME ZONE 'America/Lima' as created_lima
FROM "User" 
LIMIT 5;

-- Ver servicios con fechas
SELECT 
    id,
    "serviceNumber",
    "pickupDate",
    "pickupDate" AT TIME ZONE 'America/Lima' as pickup_lima,
    "deliveryDate",
    "deliveryDate" AT TIME ZONE 'America/Lima' as delivery_lima
FROM "Service"
WHERE "pickupDate" IS NOT NULL
LIMIT 5;
```

## 5. Configuración alternativa del servidor (Opcional)

Si quieres cambiar la zona horaria para TODO el servidor PostgreSQL:

1. Encuentra el archivo `postgresql.conf`
   - En Windows suele estar en: `C:\Program Files\PostgreSQL\[version]\data\postgresql.conf`

2. Busca la línea con `timezone` y cámbiala:
   ```
   timezone = 'America/Lima'
   ```

3. Reinicia el servicio de PostgreSQL

## 6. Para conectar desde WSL

Si sigues teniendo problemas de conexión desde WSL, intenta:

1. En el archivo `.env`, cambia la URL de conexión:
   ```bash
   # En lugar de localhost, usa host.docker.internal
   DATABASE_URL="postgresql://postgres:23432559@host.docker.internal:5432/fumylimp_db?schema=public"
   ```

2. O encuentra la IP de tu Windows:
   - En Windows PowerShell: `ipconfig`
   - Busca la IP de "Ethernet adapter vEthernet (WSL)"
   - Usa esa IP en la URL de conexión

3. Asegúrate de que PostgreSQL acepta conexiones externas:
   - En `postgresql.conf`: `listen_addresses = '*'`
   - En `pg_hba.conf`: Agregar línea para permitir conexiones desde WSL

## Resumen de lo que ya configuraste:

✅ Variable de entorno TZ=America/Lima en .env
✅ Scripts npm con TZ=America/Lima
✅ Utilidades de fecha (dateUtils.js)
✅ Configuración en database.js para establecer timezone por sesión
✅ Prisma configurado para WSL

⏳ Falta: Ejecutar ALTER DATABASE en PostgreSQL