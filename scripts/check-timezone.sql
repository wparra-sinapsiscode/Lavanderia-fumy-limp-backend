-- Script para verificar y configurar la zona horaria en PostgreSQL
-- Ejecutar este script en tu base de datos fumylimp_db

-- 1. Ver la zona horaria actual
SELECT current_setting('TIMEZONE') as timezone_actual;

-- 2. Ver la fecha/hora actual con zona horaria
SELECT 
    CURRENT_TIMESTAMP as hora_con_timezone,
    CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima' as hora_lima,
    CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as hora_utc;

-- 3. Verificar zonas horarias disponibles para Perú
SELECT * FROM pg_timezone_names 
WHERE name LIKE '%Lima%' OR name LIKE '%Peru%'
ORDER BY name;

-- 4. Cambiar la zona horaria para la base de datos (ejecutar como superusuario)
-- ALTER DATABASE fumylimp_db SET TIMEZONE TO 'America/Lima';

-- 5. Verificar algunas fechas existentes en la base de datos
SELECT 
    'User' as tabla,
    COUNT(*) as registros,
    MIN("createdAt") as fecha_mas_antigua,
    MAX("createdAt") as fecha_mas_reciente
FROM "User"
UNION ALL
SELECT 
    'Service' as tabla,
    COUNT(*) as registros,
    MIN("createdAt") as fecha_mas_antigua,
    MAX("createdAt") as fecha_mas_reciente
FROM "Service"
UNION ALL
SELECT 
    'Transaction' as tabla,
    COUNT(*) as registros,
    MIN("createdAt") as fecha_mas_antigua,
    MAX("createdAt") as fecha_mas_reciente
FROM "Transaction";