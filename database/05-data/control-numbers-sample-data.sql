-- Insertar lotes de números de control de ejemplo
-- Estos números reflejan los que ya estarían en uso en el sistema

-- Lote 1: Números del 2024 (ya usado parcialmente)
INSERT INTO control_number_batches (
  range_from,
  range_to,
  active,
  used,
  remaining,
  created_at,
  updated_at
) VALUES (
  2024001,
  2024500,
  false, -- Inactivo porque ya se agotó casi completamente
  485,   -- Ya se usaron 485 números
  15,    -- Quedan solo 15 números
  '2024-01-01 00:00:00',
  NOW()
);

-- Lote 2: Números del 2025 (activo actualmente)
INSERT INTO control_number_batches (
  range_from,
  range_to,
  active,
  used,
  remaining,
  created_at,
  updated_at
) VALUES (
  2025001,
  2025500,
  true,  -- Activo actualmente
  127,   -- Ya se usaron 127 números
  373,   -- Quedan 373 números disponibles
  '2024-12-01 00:00:00',
  NOW()
);

-- Lote 3: Números del segundo semestre 2025 (preparado para el futuro)
INSERT INTO control_number_batches (
  range_from,
  range_to,
  active,
  used,
  remaining,
  created_at,
  updated_at
) VALUES (
  2025501,
  2026000,
  false, -- Inactivo, preparado para cuando se agote el lote actual
  0,     -- Sin usar aún
  500,   -- 500 números disponibles
  '2024-12-15 00:00:00',
  NOW()
);

-- Verificar los datos insertados
SELECT
  range_from,
  range_to,
  active,
  used,
  remaining,
  CASE
    WHEN active THEN 'ACTIVO'
    ELSE 'INACTIVO'
  END as estado,
  ROUND((used::numeric / (range_to - range_from + 1)) * 100, 1) as porcentaje_uso
FROM control_number_batches
ORDER BY range_from;