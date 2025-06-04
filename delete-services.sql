-- Script para eliminar todos los servicios
-- CUIDADO: Esto eliminará TODOS los datos de la tabla Service

-- Eliminar todos los servicios
DELETE FROM public."Service";

-- Opcional: Resetear el contador de ID para que vuelva a empezar desde 1
-- (Descomenta la siguiente línea si quieres resetear el ID)
-- ALTER SEQUENCE "Service_id_seq" RESTART WITH 1;