-- AGM UCAPS · Cortes semanales compatibles con proyectos sin municipio

CREATE OR REPLACE FUNCTION public.crear_corte_semanal(p_fecha date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friday    date;
  v_anio      int;
  v_semana    int;
  v_nombre    text;
  v_corte_id  uuid;
BEGIN
  IF NOT public.can_manage_proyectos() THEN
    RAISE EXCEPTION 'Sin permiso para crear cortes semanales';
  END IF;

  v_friday := public.friday_of_week(p_fecha);
  v_anio := EXTRACT(ISOYEAR FROM v_friday)::int;
  v_semana := EXTRACT(WEEK FROM v_friday)::int;
  v_nombre := 'Corte viernes ' || to_char(v_friday, 'DD TMMon YYYY');

  INSERT INTO public.cortes_semanales (fecha_corte, anio, semana_iso, nombre, created_by)
  VALUES (v_friday, v_anio, v_semana, v_nombre, auth.uid())
  ON CONFLICT (fecha_corte) DO UPDATE
    SET nombre = EXCLUDED.nombre
  RETURNING id INTO v_corte_id;

  DELETE FROM public.proyecto_snapshot_semanal WHERE corte_semanal_id = v_corte_id;

  INSERT INTO public.proyecto_snapshot_semanal (
    corte_semanal_id, proyecto_id, nombre_corto, municipio, zona,
    avance_fisico_pct, valor_ucaps, facturado, pendiente_facturar,
    estado_codigo, estado_nombre
  )
  SELECT
    v_corte_id,
    p.id,
    COALESCE(NULLIF(p.nombre_completo, ''), p.nombre_corto),
    COALESCE(NULLIF(p.municipio_nombre, ''), m.nombre),
    COALESCE(p.zona_codigo, z.codigo),
    p.avance_fisico_pct,
    p.valor_ucaps,
    p.facturado,
    p.pendiente_facturar,
    e.codigo,
    e.nombre
  FROM public.proyectos p
  LEFT JOIN public.municipios m ON m.id = p.municipio_id
  LEFT JOIN public.zonas z ON z.id = m.zona_id
  LEFT JOIN public.estados_proyecto e ON e.id = p.estado_id
  WHERE p.activo = true;

  RETURN v_corte_id;
END;
$$;
