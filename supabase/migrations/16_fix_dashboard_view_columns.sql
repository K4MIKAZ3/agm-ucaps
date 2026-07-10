-- Fix: recrear v_dashboard_proyectos si la migración 14 falló al reemplazar la vista.
-- Ejecutar solo si ya aplicaste los ALTER TABLE de la 14 y falló el CREATE OR REPLACE VIEW.

DROP VIEW IF EXISTS public.v_kpi_dashboard;
DROP VIEW IF EXISTS public.v_dashboard_proyectos;

CREATE VIEW public.v_dashboard_proyectos
WITH (security_invoker = true)
AS
SELECT
  p.id,
  COALESCE(p.zona_codigo, z.codigo)              AS zona,
  COALESCE('Zona ' || p.zona_codigo::text, z.nombre) AS zona_nombre,
  z.color                                        AS zona_color,
  COALESCE(p.municipio_id, m.id)                 AS municipio_id,
  COALESCE(p.municipio_nombre, m.nombre)         AS municipio,
  p.codigo,
  p.nombre_corto,
  p.nombre_completo,
  p.valor_ucaps,
  p.ppto_interno,
  p.facturado,
  p.pendiente_facturar,
  ROUND(p.avance_fisico_pct, 2)                  AS avance_fisico,
  p.fecha_terminacion,
  p.fecha_terminacion_nota,
  p.fecha_acta,
  p.estado_operativo,
  e.codigo                                       AS estado_codigo,
  e.nombre                                       AS estado,
  e.color_badge                                  AS estado_color,
  p.ppto_interno_aprobado,
  p.material_aprobado,
  p.activo,
  p.updated_at,
  p.fecha_inicio
FROM public.proyectos p
LEFT JOIN public.municipios m ON m.id = p.municipio_id
LEFT JOIN public.zonas z ON z.id = m.zona_id
LEFT JOIN public.estados_proyecto e ON e.id = p.estado_id
WHERE p.activo = true;

CREATE VIEW public.v_kpi_dashboard
WITH (security_invoker = true)
AS
SELECT
  COUNT(*)                                              AS total_proyectos,
  COALESCE(SUM(valor_ucaps), 0)                         AS valor_total_contratos,
  COALESCE(SUM(facturado), 0)                           AS total_facturado,
  COALESCE(SUM(pendiente_facturar), 0)                  AS total_pendiente,
  CASE WHEN SUM(valor_ucaps) > 0
    THEN ROUND(SUM(facturado) / SUM(valor_ucaps) * 100, 2)
    ELSE 0
  END                                                   AS pct_facturado,
  COUNT(*) FILTER (WHERE estado_codigo = 'FINALIZADO')    AS proyectos_finalizados,
  COUNT(*) FILTER (WHERE estado_codigo = 'EJECUCION')   AS proyectos_ejecucion,
  COUNT(*) FILTER (WHERE estado_codigo = 'EN_COMPRAS')  AS proyectos_compras,
  COUNT(*) FILTER (WHERE estado_codigo = 'PAUSADO')     AS proyectos_pausados,
  COUNT(*) FILTER (WHERE estado_codigo = 'NO_INICIADO') AS proyectos_no_iniciados
FROM public.v_dashboard_proyectos;
