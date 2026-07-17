-- AGM UCAPS · Cortes por fecha seleccionada y administración restringida

CREATE OR REPLACE FUNCTION public.crear_corte_semanal(p_fecha date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha     date;
  v_anio      int;
  v_semana    int;
  v_nombre    text;
  v_corte_id  uuid;
BEGIN
  IF public.get_user_rol() NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Sin permiso para crear cortes';
  END IF;

  v_fecha := COALESCE(p_fecha, CURRENT_DATE);
  v_anio := EXTRACT(ISOYEAR FROM v_fecha)::int;
  v_semana := EXTRACT(WEEK FROM v_fecha)::int;
  v_nombre := 'Corte ' || to_char(v_fecha, 'DD TMMon YYYY');

  INSERT INTO public.cortes_semanales (fecha_corte, anio, semana_iso, nombre, created_by)
  VALUES (v_fecha, v_anio, v_semana, v_nombre, auth.uid())
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

DROP POLICY IF EXISTS cortes_manage ON public.cortes_semanales;
DROP POLICY IF EXISTS cortes_insert ON public.cortes_semanales;
DROP POLICY IF EXISTS cortes_update ON public.cortes_semanales;
DROP POLICY IF EXISTS cortes_delete ON public.cortes_semanales;

CREATE POLICY cortes_insert ON public.cortes_semanales
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_rol() IN ('super_admin', 'admin'));

CREATE POLICY cortes_update ON public.cortes_semanales
  FOR UPDATE TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_user_rol() IN ('super_admin', 'admin'));

CREATE POLICY cortes_delete ON public.cortes_semanales
  FOR DELETE TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS snapshot_semanal_manage ON public.proyecto_snapshot_semanal;
DROP POLICY IF EXISTS snapshot_semanal_insert ON public.proyecto_snapshot_semanal;
DROP POLICY IF EXISTS snapshot_semanal_update ON public.proyecto_snapshot_semanal;
DROP POLICY IF EXISTS snapshot_semanal_delete ON public.proyecto_snapshot_semanal;

CREATE POLICY snapshot_semanal_insert ON public.proyecto_snapshot_semanal
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_rol() IN ('super_admin', 'admin'));

CREATE POLICY snapshot_semanal_update ON public.proyecto_snapshot_semanal
  FOR UPDATE TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_user_rol() IN ('super_admin', 'admin'));

CREATE POLICY snapshot_semanal_delete ON public.proyecto_snapshot_semanal
  FOR DELETE TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin'));
