-- Sincroniza % avance al editar cantidad ejecutada manualmente en proyecto_items

CREATE OR REPLACE FUNCTION public.sync_proyecto_item_avance_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.anulado THEN
    RETURN NEW;
  END IF;

  NEW.cantidad_ejecutada := LEAST(GREATEST(COALESCE(NEW.cantidad_ejecutada, 0), 0), COALESCE(NEW.cantidad_total, 0));

  IF COALESCE(NEW.cantidad_total, 0) > 0 THEN
    NEW.avance_pct := ROUND((NEW.cantidad_ejecutada / NEW.cantidad_total) * 100, 4);
  ELSE
    NEW.avance_pct := 0;
  END IF;

  NEW.valor_ejecutado := ROUND(NEW.cantidad_ejecutada * COALESCE(NEW.valor_unitario, 0), 2);
  NEW.completado := (NEW.cantidad_total > 0 AND NEW.cantidad_ejecutada >= NEW.cantidad_total);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_item_avance_manual ON public.proyecto_items;

CREATE TRIGGER trg_sync_item_avance_manual
  BEFORE INSERT OR UPDATE OF cantidad_ejecutada, cantidad_total, valor_unitario
  ON public.proyecto_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_proyecto_item_avance_manual();
