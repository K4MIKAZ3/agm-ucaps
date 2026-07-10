-- AGM UCAPS · Ubicación manual y fechas de proyecto

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS municipio_nombre text,
  ADD COLUMN IF NOT EXISTS zona_codigo int CHECK (zona_codigo IS NULL OR (zona_codigo >= 1 AND zona_codigo <= 5)),
  ADD COLUMN IF NOT EXISTS fecha_inicio date;

-- municipio_id deja de ser obligatorio (ubicación manual en proyecto)
ALTER TABLE public.proyectos
  ALTER COLUMN municipio_id DROP NOT NULL;

-- Backfill desde catálogo existente
UPDATE public.proyectos p
SET
  municipio_nombre = COALESCE(p.municipio_nombre, m.nombre),
  zona_codigo = COALESCE(p.zona_codigo, z.codigo)
FROM public.municipios m
JOIN public.zonas z ON z.id = m.zona_id
WHERE p.municipio_id = m.id
  AND (p.municipio_nombre IS NULL OR p.zona_codigo IS NULL);

CREATE OR REPLACE VIEW public.v_dashboard_proyectos
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
  p.fecha_inicio,
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
  p.updated_at
FROM public.proyectos p
LEFT JOIN public.municipios m ON m.id = p.municipio_id
LEFT JOIN public.zonas z ON z.id = m.zona_id
LEFT JOIN public.estados_proyecto e ON e.id = p.estado_id
WHERE p.activo = true;
