-- AGM UCAPS · Perfiles de usuario y proyectos

-- ─── PERFILES (vinculado a auth.users) ───────────────────────────────────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  nombre      text,
  rol         text NOT NULL DEFAULT 'viewer'
              CHECK (rol IN ('super_admin', 'admin', 'editor', 'viewer')),
  activo      boolean NOT NULL DEFAULT true,
  creado_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_rol ON public.profiles(rol) WHERE activo = true;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── REPORTES MENSUALES (corte Julio 2026, etc.) ─────────────────────────────
CREATE TABLE public.reportes_mensuales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio            int  NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
  mes             int  NOT NULL CHECK (mes >= 1 AND mes <= 12),
  nombre          text NOT NULL,
  fecha_corte     date,
  importado_desde text,
  cerrado         boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, mes)
);

-- ─── PROYECTOS ───────────────────────────────────────────────────────────────
CREATE TABLE public.proyectos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id            uuid NOT NULL REFERENCES public.municipios(id) ON DELETE RESTRICT,
  codigo                  text,
  nombre_corto            text NOT NULL,
  nombre_completo         text,

  fecha_acta              date,
  fecha_elaboracion       date,
  duracion_texto          text,
  duracion_meses          int,

  estado_id               uuid REFERENCES public.estados_proyecto(id) ON DELETE SET NULL,
  estado_operativo        text,

  ppto_interno_aprobado   boolean,
  material_aprobado       boolean,

  valor_ucaps             numeric(18,2) NOT NULL DEFAULT 0,
  ppto_interno            numeric(18,2) NOT NULL DEFAULT 0,
  facturado               numeric(18,2) NOT NULL DEFAULT 0,
  pendiente_facturar      numeric(18,2) GENERATED ALWAYS AS (
                            GREATEST(valor_ucaps - facturado, 0)
                          ) STORED,

  avance_fisico_pct       numeric(8,4) NOT NULL DEFAULT 0,
  avance_calculado_auto   boolean NOT NULL DEFAULT true,

  fecha_terminacion       date,
  fecha_terminacion_nota  text,

  activo                  boolean NOT NULL DEFAULT true,
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proyectos_municipio ON public.proyectos(municipio_id);
CREATE INDEX idx_proyectos_estado ON public.proyectos(estado_id);
CREATE INDEX idx_proyectos_activo ON public.proyectos(activo) WHERE activo = true;

CREATE TRIGGER trg_proyectos_updated_at
  BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ÍTEMS DEL PROYECTO (1 a 1 al crear) ─────────────────────────────────────
CREATE TABLE public.proyecto_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id          uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  categoria_id         uuid REFERENCES public.categorias_item(id) ON DELETE SET NULL,
  actividad_id         uuid REFERENCES public.actividades_catalogo(id) ON DELETE RESTRICT,
  numero_item          int,
  descripcion_override text,

  unidad_id            uuid REFERENCES public.unidades_medida(id) ON DELETE SET NULL,
  cantidad_total       numeric(18,4) NOT NULL DEFAULT 0 CHECK (cantidad_total >= 0),
  valor_unitario       numeric(18,2) NOT NULL DEFAULT 0,
  valor_total          numeric(18,2) GENERATED ALWAYS AS (
                         ROUND(cantidad_total * valor_unitario, 2)
                       ) STORED,

  cantidad_ejecutada   numeric(18,4) NOT NULL DEFAULT 0 CHECK (cantidad_ejecutada >= 0),
  valor_ejecutado      numeric(18,2) NOT NULL DEFAULT 0,
  avance_pct           numeric(8,4) NOT NULL DEFAULT 0 CHECK (avance_pct >= 0 AND avance_pct <= 100),

  anulado              boolean NOT NULL DEFAULT false,
  completado           boolean NOT NULL DEFAULT false,
  observaciones        text,
  orden                int NOT NULL DEFAULT 0,

  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proyecto_items_proyecto ON public.proyecto_items(proyecto_id);
CREATE INDEX idx_proyecto_items_actividad ON public.proyecto_items(actividad_id);

CREATE TRIGGER trg_proyecto_items_updated_at
  BEFORE UPDATE ON public.proyecto_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── AVANCE MENSUAL POR ÍTEM (cantidad instalada este mes) ───────────────────
CREATE TABLE public.item_avance_mensual (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_item_id    uuid NOT NULL REFERENCES public.proyecto_items(id) ON DELETE CASCADE,
  reporte_mensual_id  uuid NOT NULL REFERENCES public.reportes_mensuales(id) ON DELETE CASCADE,
  cantidad_mes        numeric(18,4) NOT NULL DEFAULT 0 CHECK (cantidad_mes >= 0),
  cantidad_acumulada  numeric(18,4) NOT NULL DEFAULT 0 CHECK (cantidad_acumulada >= 0),
  avance_pct          numeric(8,4) NOT NULL DEFAULT 0,
  valor_ejecutado_mes numeric(18,2) NOT NULL DEFAULT 0,
  observaciones       text,
  registrado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proyecto_item_id, reporte_mensual_id)
);

CREATE INDEX idx_item_avance_reporte ON public.item_avance_mensual(reporte_mensual_id);

CREATE TRIGGER trg_item_avance_updated_at
  BEFORE UPDATE ON public.item_avance_mensual
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RUBROS FINANCIEROS POR PROYECTO ────────────────────────────────────────
CREATE TABLE public.proyecto_rubros (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id  uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  rubro_id     uuid NOT NULL REFERENCES public.rubros_presupuesto(id) ON DELETE RESTRICT,
  valor        numeric(18,2) NOT NULL DEFAULT 0,
  UNIQUE (proyecto_id, rubro_id)
);

-- ─── BALANCE UCAPS POR PROYECTO ──────────────────────────────────────────────
CREATE TABLE public.proyecto_balance_ucaps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  categoria_ucaps_id  uuid NOT NULL REFERENCES public.categorias_ucaps(id) ON DELETE RESTRICT,
  valor_inversion     numeric(18,2) NOT NULL DEFAULT 0,
  UNIQUE (proyecto_id, categoria_ucaps_id)
);

-- ─── SNAPSHOT RESUMEN POR MES (histórico gerencial) ───────────────────────────
CREATE TABLE public.proyecto_snapshot_mensual (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_mensual_id  uuid NOT NULL REFERENCES public.reportes_mensuales(id) ON DELETE CASCADE,
  proyecto_id         uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  avance_fisico_pct   numeric(8,4) NOT NULL DEFAULT 0,
  valor_ucaps         numeric(18,2) NOT NULL DEFAULT 0,
  facturado           numeric(18,2) NOT NULL DEFAULT 0,
  ppto_interno        numeric(18,2) NOT NULL DEFAULT 0,
  estado_id           uuid REFERENCES public.estados_proyecto(id),
  estado_operativo    text,
  UNIQUE (reporte_mensual_id, proyecto_id)
);

-- ─── LOG DE IMPORTACIONES EXCEL ──────────────────────────────────────────────
CREATE TABLE public.importaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archivo             text NOT NULL,
  reporte_mensual_id  uuid REFERENCES public.reportes_mensuales(id) ON DELETE SET NULL,
  filas_ok            int NOT NULL DEFAULT 0,
  filas_error         int NOT NULL DEFAULT 0,
  log_json            jsonb,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
