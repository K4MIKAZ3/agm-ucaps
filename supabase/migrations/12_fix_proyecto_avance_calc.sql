-- Corrige avance del proyecto cuando los ítems tienen valor $0
-- (antes usaba AVG(avance_pct) y podía marcar 100% con ítems sin valor monetario)

CREATE OR REPLACE FUNCTION public.recalcular_proyecto_avance(p_proyecto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum_valor_total   numeric(18,2);
  v_sum_valor_ej      numeric(18,2);
  v_avance            numeric(8,4);
  v_estado_sugerido   uuid;
  v_auto              boolean;
BEGIN
  SELECT avance_calculado_auto INTO v_auto
  FROM public.proyectos WHERE id = p_proyecto_id;

  IF NOT FOUND OR v_auto IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(valor_total), 0),
    COALESCE(SUM(valor_ejecutado), 0)
  INTO v_sum_valor_total, v_sum_valor_ej
  FROM public.proyecto_items
  WHERE proyecto_id = p_proyecto_id AND NOT anulado;

  IF v_sum_valor_total > 0 THEN
    v_avance := ROUND((v_sum_valor_ej / v_sum_valor_total) * 100, 4);
  ELSE
    SELECT COALESCE(
      ROUND(
        SUM(avance_pct * cantidad_total)
        / NULLIF(SUM(cantidad_total) FILTER (WHERE cantidad_total > 0), 0),
        4
      ),
      0
    )
    INTO v_avance
    FROM public.proyecto_items
    WHERE proyecto_id = p_proyecto_id AND NOT anulado;
  END IF;

  IF v_avance >= 100 THEN
    SELECT id INTO v_estado_sugerido FROM public.estados_proyecto
    WHERE codigo = 'FINALIZADO' LIMIT 1;
  ELSIF v_avance > 0 THEN
    SELECT id INTO v_estado_sugerido FROM public.estados_proyecto
    WHERE codigo = 'EJECUCION' LIMIT 1;
  ELSE
    SELECT id INTO v_estado_sugerido FROM public.estados_proyecto
    WHERE codigo = 'NO_INICIADO' LIMIT 1;
  END IF;

  UPDATE public.proyectos
  SET
    avance_fisico_pct = COALESCE(v_avance, 0),
    estado_id         = COALESCE(v_estado_sugerido, estado_id),
    updated_at        = now()
  WHERE id = p_proyecto_id;
END;
$$;

-- Recalcular proyectos existentes con avance automático
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.proyectos WHERE activo = true AND avance_calculado_auto = true
  LOOP
    PERFORM public.recalcular_proyecto_avance(r.id);
  END LOOP;
END $$;
