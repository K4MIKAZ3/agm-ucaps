-- ============================================================================
-- AGM UCAPS · RESET DATOS OPERATIVOS (solo SQL Editor de Supabase)
-- ============================================================================
--
-- QUÉ HACE:
--   Borra proyectos, ítems, avances, snapshots, reportes e importaciones.
--   CONSERVA: usuarios (auth + profiles), catálogos (zonas, municipios,
--   estados, actividades, unidades, rubros, etc.)
--
-- QUIÉN PUEDE EJECUTARLO:
--   Solo alguien con acceso al SQL Editor de Supabase (service role / postgres).
--   No está expuesto desde la app.
--
-- CÓMO EJECUTAR:
--   1. Lee todo este archivo.
--   2. Cambia la variable confirm_wipe de FALSE a TRUE (línea ~25).
--   3. Ejecuta el script completo en SQL Editor.
--   4. Vuelve a poner confirm_wipe en FALSE después.
--
-- ============================================================================

DO $reset$
DECLARE
  -- ⚠️ CAMBIAR A TRUE PARA EJECUTAR EL BORRADO
  confirm_wipe boolean := FALSE;
BEGIN
  IF NOT confirm_wipe THEN
    RAISE EXCEPTION
      'Reset cancelado. Cambia confirm_wipe a TRUE en la línea DECLARE de este script.';
  END IF;

  RAISE NOTICE 'Iniciando reset de datos operativos AGM UCAPS…';

  TRUNCATE TABLE
    public.importaciones,
    public.item_avance_mensual,
    public.proyecto_snapshot_mensual,
    public.proyecto_items,
    public.proyecto_rubros,
    public.proyecto_balance_ucaps,
    public.proyectos,
    public.reportes_mensuales
  RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Reset completado. Catálogos y usuarios intactos.';
  RAISE NOTICE 'Puedes cargar proyectos reales desde Admin → Proyectos.';
END $reset$;

-- Verificación rápida (debe devolver 0 en todas las filas):
SELECT 'proyectos' AS tabla, COUNT(*) AS filas FROM public.proyectos
UNION ALL SELECT 'proyecto_items', COUNT(*) FROM public.proyecto_items
UNION ALL SELECT 'item_avance_mensual', COUNT(*) FROM public.item_avance_mensual
UNION ALL SELECT 'reportes_mensuales', COUNT(*) FROM public.reportes_mensuales
UNION ALL SELECT 'importaciones', COUNT(*) FROM public.importaciones
UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL SELECT 'municipios', COUNT(*) FROM public.municipios;
