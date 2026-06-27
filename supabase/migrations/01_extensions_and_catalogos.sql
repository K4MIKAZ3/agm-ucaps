-- AGM UCAPS · Catálogos maestros (gestionados por super_admin)
-- Ejecutar en Supabase SQL Editor o via: supabase db push

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ZONAS ───────────────────────────────────────────────────────────────────
CREATE TABLE public.zonas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     int  NOT NULL UNIQUE,
  nombre     text NOT NULL,
  color      text NOT NULL DEFAULT '#2a78d6',
  orden      int  NOT NULL DEFAULT 0,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── MUNICIPIOS ──────────────────────────────────────────────────────────────
CREATE TABLE public.municipios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id    uuid NOT NULL REFERENCES public.zonas(id) ON DELETE RESTRICT,
  nombre     text NOT NULL,
  codigo     text,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zona_id, nombre)
);

CREATE INDEX idx_municipios_zona ON public.municipios(zona_id);

-- ─── ESTADOS DE PROYECTO ─────────────────────────────────────────────────────
CREATE TABLE public.estados_proyecto (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       text NOT NULL UNIQUE,
  nombre       text NOT NULL,
  color_badge  text NOT NULL DEFAULT '#2a78d6',
  orden        int  NOT NULL DEFAULT 0,
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── UNIDADES DE MEDIDA ──────────────────────────────────────────────────────
CREATE TABLE public.unidades_medida (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     text NOT NULL UNIQUE,
  nombre     text NOT NULL,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CATEGORÍAS DE ÍTEM (secciones Excel) ────────────────────────────────────
CREATE TABLE public.categorias_item (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     text NOT NULL UNIQUE,
  nombre     text NOT NULL,
  tipo       text NOT NULL DEFAULT 'material'
             CHECK (tipo IN ('material', 'rubro_financiero', 'impuesto', 'subtotal')),
  orden      int  NOT NULL DEFAULT 0,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── ACTIVIDADES CATÁLOGO (evita repetición entre proyectos) ─────────────────
CREATE TABLE public.actividades_catalogo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text,
  nombre        text NOT NULL,
  categoria_id  uuid REFERENCES public.categorias_item(id) ON DELETE SET NULL,
  unidad_id     uuid REFERENCES public.unidades_medida(id) ON DELETE SET NULL,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_actividades_nombre_unidad
  ON public.actividades_catalogo (lower(trim(nombre)), unidad_id)
  WHERE activo = true;

-- ─── RUBROS PRESUPUESTO (MO, MAT, LUMN…) ─────────────────────────────────────
CREATE TABLE public.rubros_presupuesto (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     text NOT NULL UNIQUE,
  nombre     text NOT NULL,
  orden      int  NOT NULL DEFAULT 0,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CATEGORÍAS UCAPS (balance financiero) ───────────────────────────────────
CREATE TABLE public.categorias_ucaps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     text NOT NULL UNIQUE,
  nombre     text NOT NULL,
  orden      int  NOT NULL DEFAULT 0,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── updated_at automático ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zonas_updated_at
  BEFORE UPDATE ON public.zonas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_municipios_updated_at
  BEFORE UPDATE ON public.municipios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_actividades_updated_at
  BEFORE UPDATE ON public.actividades_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
