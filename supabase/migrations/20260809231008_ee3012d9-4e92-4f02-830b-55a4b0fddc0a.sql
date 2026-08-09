INSERT INTO public.games (slug, name, description, category, is_premium, state, sort_order)
VALUES
  ('space-invaders', 'Space Invaders', 'Defenda a base contra ondas de invasores neon: mova, atire e sobreviva.', 'classicos_8bits', false, 'playable', 7),
  ('mini-racer', 'Mini Racer', 'Corrida arcade em faixas: desvie dos carros, pegue moedas e vá cada vez mais rápido.', 'mais_jogados', false, 'playable', 8)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    state = EXCLUDED.state,
    sort_order = EXCLUDED.sort_order;