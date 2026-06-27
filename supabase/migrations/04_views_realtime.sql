-- AGM UCAPS · Vistas para dashboard y Realtime

CREATE OR REPLACE VIEW public.v_dashboard_proyectos
WITH (security_invoker = true)
AS
SELECT
  p.id,
  z.codigo                              AS zona,
  z.nombre                              AS zona_nombre,
  z.color                               AS zona_color,
  m.id                                  AS municipio_id,
  m.nombre                              AS municipio,
  p.codigo,
  p.nombre_corto,
  p.nombre_completo,
  p.valor_ucaps,
  p.ppto_interno,
  p.facturado,
  p.pendiente_facturar,
  ROUND(p.avance_fisico_pct, 2)         AS avance_fisico,
  p.fecha_terminacion,
  p.fecha_terminacion_nota,
  p.fecha_acta,
  p.estado_operativo,
  e.codigo                              AS estado_codigo,
  e.nombre                              AS estado,
  e.color_badge                         AS estado_color,
  p.ppto_interno_aprobado,
  p.material_aprobado,
  p.activo,
  p.updated_at
FROM public.proyectos p
JOIN public.municipios m ON m.id = p.municipio_id
JOIN public.zonas z ON z.id = m.zona_id
LEFT JOIN public.estados_proyecto e ON e.id = p.estado_id
WHERE p.activo = true;

CREATE OR REPLACE VIEW public.v_proyecto_items_detalle
WITH (security_invoker = true)
AS
SELECT
  pi.id,
  pi.proyecto_id,
  p.nombre_corto                        AS proyecto,
  pi.numero_item,
  pi.orden,
  ac.id                                 AS actividad_id,
  COALESCE(pi.descripcion_override, ac.nombre) AS actividad,
  ci.nombre                             AS categoria,
  um.codigo                             AS unidad,
  pi.cantidad_total,
  pi.cantidad_ejecutada,
  pi.valor_unitario,
  pi.valor_total,
  pi.valor_ejecutado,
  ROUND(pi.avance_pct, 2)               AS avance_pct,
  pi.anulado,
  pi.completado,
  pi.observaciones,
  pi.updated_at
FROM public.proyecto_items pi
JOIN public.proyectos p ON p.id = pi.proyecto_id
LEFT JOIN public.actividades_catalogo ac ON ac.id = pi.actividad_id
LEFT JOIN public.categorias_item ci ON ci.id = pi.categoria_id
LEFT JOIN public.unidades_medida um ON um.id = pi.unidad_id
WHERE NOT pi.anulado;

CREATE OR REPLACE VIEW public.v_kpi_dashboard
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

-- Habilitar Realtime (si falla, activar manualmente en Dashboard → Database → Replication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.proyectos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.proyecto_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.item_avance_mensual;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
