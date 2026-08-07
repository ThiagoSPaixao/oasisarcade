UPDATE public.games SET state = 'playable', is_premium = false, sort_order = 1, description = 'Encaixe os blocos, limpe as linhas e ganhe velocidade.' WHERE slug = 'tetris';
UPDATE public.games SET state = 'playable', is_premium = false, sort_order = 2 WHERE slug = 'snake';
UPDATE public.games SET slug = 'space-shooter', name = 'Space Shooter', state = 'playable', is_premium = false, sort_order = 4, description = 'Pilote sua nave, desvie dos tiros e destrua a frota inimiga.' WHERE slug = 'nave';
UPDATE public.games SET slug = 'breakout', name = 'Breakout', state = 'playable', is_premium = false, sort_order = 5, category = 'classicos_8bits', description = 'Rebata a bola e quebre todos os tijolos neon.' WHERE slug = 'arkanoid';
INSERT INTO public.games (slug, name, description, category, is_premium, state, sort_order)
VALUES
  ('memoria', 'Jogo da Memória', 'Vire as cartas e encontre todos os pares 8-bit.', 'mais_jogados', false, 'playable', 3),
  ('pong', 'Pong', 'O duelo de raquetes que começou tudo. Você contra a CPU.', 'classicos_8bits', false, 'playable', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  state = EXCLUDED.state,
  sort_order = EXCLUDED.sort_order;