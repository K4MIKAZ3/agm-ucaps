-- Permite ítems con actividad libre por proyecto (sin catálogo obligatorio)
ALTER TABLE public.proyecto_items
  ALTER COLUMN actividad_id DROP NOT NULL;

ALTER TABLE public.proyecto_items
  DROP CONSTRAINT IF EXISTS proyecto_items_actividad_check;

ALTER TABLE public.proyecto_items
  ADD CONSTRAINT proyecto_items_actividad_check
  CHECK (
    actividad_id IS NOT NULL
    OR (descripcion_override IS NOT NULL AND btrim(descripcion_override) <> '')
  );
