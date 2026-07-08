-- Cortes semanales (viernes) para comparar avance entre semanas

CREATE TABLE IF NOT EXISTS public.cortes_semanales (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_corte  date NOT NULL UNIQUE,
  anio         int  NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
  semana_iso   int  NOT NULL CHECK (semana_iso >= 1 AND semana_iso <= 53),
  nombre       text NOT NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, semana_iso)
);

CREATE TABLE IF NOT EXISTS public.proyecto_snapshot_semanal (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corte_semanal_id    uuid NOT NULL REFERENCES public.cortes_semanales(id) ON DELETE CASCADE,
  proyecto_id         uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre_corto        text NOT NULL,
  municipio           text,
  zona                int,
  avance_fisico_pct   numeric(8,4) NOT NULL DEFAULT 0,
  valor_ucaps         numeric(18,2) NOT NULL DEFAULT 0,
  facturado           numeric(18,2) NOT NULL DEFAULT 0,
  pendiente_facturar  numeric(18,2) NOT NULL DEFAULT 0,
  estado_codigo       text,
  estado_nombre       text,
  UNIQUE (corte_semanal_id, proyecto_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_semanal_corte
  ON public.proyecto_snapshot_semanal(corte_semanal_id);

CREATE INDEX IF NOT EXISTS idx_snapshot_semanal_proyecto
  ON public.proyecto_snapshot_semanal(proyecto_id);

-- Normaliza una fecha al viernes de esa semana (Postgres DOW: 0=domingo … 5=viernes)
CREATE OR REPLACE FUNCTION public.friday_of_week(p_fecha date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_fecha - (
    CASE
      WHEN EXTRACT(DOW FROM p_fecha)::int >= 5
        THEN EXTRACT(DOW FROM p_fecha)::int - 5
      ELSE EXTRACT(DOW FROM p_fecha)::int + 2
    END
  );
$$;

-- Crea o actualiza el corte del viernes indicado (por defecto: viernes de la semana actual)
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
    p.nombre_corto,
    m.nombre,
    z.codigo,
    p.avance_fisico_pct,
    p.valor_ucaps,
    p.facturado,
    p.pendiente_facturar,
    e.codigo,
    e.nombre
  FROM public.proyectos p
  JOIN public.municipios m ON m.id = p.municipio_id
  JOIN public.zonas z ON z.id = m.zona_id
  LEFT JOIN public.estados_proyecto e ON e.id = p.estado_id
  WHERE p.activo = true;

  RETURN v_corte_id;
END;
$$;

ALTER TABLE public.cortes_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_snapshot_semanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cortes_select ON public.cortes_semanales;
CREATE POLICY cortes_select ON public.cortes_semanales
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin', 'editor', 'viewer'));

DROP POLICY IF EXISTS cortes_manage ON public.cortes_semanales;
CREATE POLICY cortes_manage ON public.cortes_semanales
  FOR ALL TO authenticated
  USING (public.can_manage_proyectos())
  WITH CHECK (public.can_manage_proyectos());

DROP POLICY IF EXISTS snapshot_semanal_select ON public.proyecto_snapshot_semanal;
CREATE POLICY snapshot_semanal_select ON public.proyecto_snapshot_semanal
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin', 'editor', 'viewer'));

DROP POLICY IF EXISTS snapshot_semanal_manage ON public.proyecto_snapshot_semanal;
CREATE POLICY snapshot_semanal_manage ON public.proyecto_snapshot_semanal
  FOR ALL TO authenticated
  USING (public.can_manage_proyectos())
  WITH CHECK (public.can_manage_proyectos());
