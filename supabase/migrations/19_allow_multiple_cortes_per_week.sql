-- AGM UCAPS · Permitir cortes por fecha exacta dentro de una misma semana

ALTER TABLE public.cortes_semanales
  DROP CONSTRAINT IF EXISTS cortes_semanales_anio_semana_iso_key;
