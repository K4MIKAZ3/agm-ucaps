-- AGM UCAPS · Datos iniciales de catálogos
-- Ejecutar después de las migraciones

-- ─── ZONAS ───────────────────────────────────────────────────────────────────
INSERT INTO public.zonas (codigo, nombre, color, orden) VALUES
  (1, 'Zona 1', '#2a78d6', 1),
  (2, 'Zona 2', '#1baf7a', 2),
  (3, 'Zona 3', '#eda100', 3),
  (4, 'Zona 4', '#4a3aa7', 4),
  (5, 'Zona 5', '#e34948', 5)
ON CONFLICT (codigo) DO NOTHING;

-- ─── ESTADOS DE PROYECTO ─────────────────────────────────────────────────────
INSERT INTO public.estados_proyecto (codigo, nombre, color_badge, orden) VALUES
  ('EJECUCION',    'Ejecución',    '#2a78d6', 1),
  ('FINALIZADO',   'Finalizado',   '#1baf7a', 2),
  ('EN_COMPRAS',   'En Compras',   '#eda100', 3),
  ('PAUSADO',      'Pausado',      '#e34948', 4),
  ('NO_INICIADO',  'No Iniciado',  '#92b4e8', 5)
ON CONFLICT (codigo) DO NOTHING;

-- ─── UNIDADES DE MEDIDA ──────────────────────────────────────────────────────
INSERT INTO public.unidades_medida (codigo, nombre) VALUES
  ('UND', 'Unidad'),
  ('ML',  'Metro lineal'),
  ('M',   'Metro'),
  ('KM',  'Kilómetro')
ON CONFLICT (codigo) DO NOTHING;

-- ─── CATEGORÍAS DE ÍTEM ──────────────────────────────────────────────────────
INSERT INTO public.categorias_item (codigo, nombre, tipo, orden) VALUES
  ('SUMINISTRO', 'Suministro de materiales', 'material', 1),
  ('MANO_OBRA',  'Mano de obra',             'rubro_financiero', 2),
  ('UTILIDAD',   'Utilidad',                 'impuesto', 3),
  ('IVA',        'IVA',                      'impuesto', 4),
  ('SUBTOTAL',   'Subtotal',                 'subtotal', 5)
ON CONFLICT (codigo) DO NOTHING;

-- ─── RUBROS PRESUPUESTO ──────────────────────────────────────────────────────
INSERT INTO public.rubros_presupuesto (codigo, nombre, orden) VALUES
  ('MO',           'Mano de obra',           1),
  ('MAT',          'Materiales',             2),
  ('LUMN',         'Luminarias',             3),
  ('LOGISTICA',    'Logística',              4),
  ('AD_GEREN',     'Administración + Gerencia', 5),
  ('GERENCIAMIENTO','Gerenciamiento',        6),
  ('MAT_DISPONIBLE','Material disponible',   7),
  ('ADMINISTRACION','Administración',       8)
ON CONFLICT (codigo) DO NOTHING;

-- ─── CATEGORÍAS UCAPS ────────────────────────────────────────────────────────
INSERT INTO public.categorias_ucaps (codigo, nombre, orden) VALUES
  ('LUMINARIAS',   'Luminarias',    1),
  ('REDES',        'Redes',         2),
  ('POSTES',       'Postes',        3),
  ('CANALIZACION', 'Canalización',  4),
  ('TRAFOS',       'Transformadores', 5),
  ('SPT',          'SPT',           6)
ON CONFLICT (codigo) DO NOTHING;

-- ─── MUNICIPIOS (según dashboard AGM) ────────────────────────────────────────
INSERT INTO public.municipios (zona_id, nombre)
SELECT z.id, m.nombre
FROM (VALUES
  (1, 'Bosconia'), (1, 'El Copey'), (1, 'Magangué'), (1, 'San Estanislao'),
  (2, 'Cúcuta'), (2, 'San Cayetano'), (2, 'Sardinata'), (2, 'Puerto Santander'), (2, 'Los Patios'),
  (3, 'Neiva'), (3, 'Pitalito'), (3, 'La Dorada'), (3, 'Neiva Ornato'),
  (4, 'Aguachica'), (4, 'La Gloria'), (4, 'Ocaña'),
  (5, 'Pereira')
) AS m(zona_codigo, nombre)
JOIN public.zonas z ON z.codigo = m.zona_codigo
ON CONFLICT (zona_id, nombre) DO NOTHING;

-- ─── ACTIVIDADES FRECUENTES (catálogo UCAPS) ─────────────────────────────────
INSERT INTO public.actividades_catalogo (nombre, categoria_id, unidad_id)
SELECT a.nombre, ci.id, um.id
FROM (VALUES
  ('Luminaria LED 27W',       'SUMINISTRO', 'UND'),
  ('Luminaria LED 37W',       'SUMINISTRO', 'UND'),
  ('Luminaria LED 60W',       'SUMINISTRO', 'UND'),
  ('Luminaria LED 92W',       'SUMINISTRO', 'UND'),
  ('Luminaria LED 120W',      'SUMINISTRO', 'UND'),
  ('Luminaria LED 150W',      'SUMINISTRO', 'UND'),
  ('Reflector LED 100W',      'SUMINISTRO', 'UND'),
  ('Reflector LED 200W',      'SUMINISTRO', 'UND'),
  ('Reflector LED 400W',      'SUMINISTRO', 'UND'),
  ('Reflector LED 750W',      'SUMINISTRO', 'UND'),
  ('Fotocontrol multitensión 277V', 'SUMINISTRO', 'UND'),
  ('Poste metálico 4m',       'SUMINISTRO', 'UND'),
  ('Poste metálico 5m',       'SUMINISTRO', 'UND'),
  ('Poste metálico 12m',      'SUMINISTRO', 'UND'),
  ('Poste de fibra 8m x 510kg.f', 'SUMINISTRO', 'UND'),
  ('Poste de fibra 10m x 510kg.f','SUMINISTRO', 'UND'),
  ('Poste de fibra 12m x 510kg.f','SUMINISTRO', 'UND'),
  ('Poste traslúcido 8m x 750kgf', 'SUMINISTRO', 'UND'),
  ('Poste traslúcido 12m x 510kgf','SUMINISTRO', 'UND'),
  ('Red aérea 2x4+4 AWG AL x 500m', 'SUMINISTRO', 'UND'),
  ('Red aérea 2x2+2 AWG AL x 500m', 'SUMINISTRO', 'UND'),
  ('Cable encauchetado 3x12 AWG x 500m', 'SUMINISTRO', 'UND'),
  ('Canalización ducto PVC 1" x 500m', 'SUMINISTRO', 'ML'),
  ('Canalización ducto PVC 2" x 500m', 'SUMINISTRO', 'ML'),
  ('Sistema puesta a tierra Stavol', 'SUMINISTRO', 'UND'),
  ('Caja prefabricada 30x30x60', 'SUMINISTRO', 'UND'),
  ('Punto conexión red compartida brazo 1.0-1.5', 'SUMINISTRO', 'UND'),
  ('Punto conexión red compartida brazo 1.5-2.0', 'SUMINISTRO', 'UND'),
  ('Punto conexión red compartida brazo 2.0-2.4', 'SUMINISTRO', 'UND')
) AS a(nombre, cat_codigo, unidad_codigo)
JOIN public.categorias_item ci ON ci.codigo = a.cat_codigo
JOIN public.unidades_medida um ON um.codigo = a.unidad_codigo
WHERE NOT EXISTS (
  SELECT 1 FROM public.actividades_catalogo x
  WHERE lower(trim(x.nombre)) = lower(trim(a.nombre))
    AND x.unidad_id = um.id
);

-- ─── REPORTE MENSUAL INICIAL ─────────────────────────────────────────────────
INSERT INTO public.reportes_mensuales (anio, mes, nombre, fecha_corte)
VALUES (2026, 7, 'Julio 2026', '2026-07-31')
ON CONFLICT (anio, mes) DO NOTHING;
