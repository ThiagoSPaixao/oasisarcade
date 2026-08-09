-- ============ 1. NÍVEIS ============
CREATE OR REPLACE FUNCTION public.xp_for_level(_level integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _level <= 1 THEN 0
         ELSE 100 * (_level - 1) + 25 * (_level - 1) * (_level - 2) END
$$;

CREATE OR REPLACE FUNCTION public.level_for_xp(_xp integer)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE _lvl integer := 1;
BEGIN
  IF _xp IS NULL OR _xp <= 0 THEN RETURN 1; END IF;
  WHILE _lvl < 100 AND public.xp_for_level(_lvl + 1) <= _xp LOOP
    _lvl := _lvl + 1;
  END LOOP;
  RETURN _lvl;
END; $$;

-- XP continua sendo autoridade do servidor; o nível agora usa a curva central.
CREATE OR REPLACE FUNCTION public.grant_xp_for(_user_id uuid, _amount integer)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.profiles;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid xp amount'; END IF;
  IF _amount > 5000 THEN _amount := 5000; END IF;

  UPDATE public.profiles p
     SET xp = p.xp + _amount,
         level = public.level_for_xp(p.xp + _amount),
         updated_at = now()
   WHERE p.id = _user_id
  RETURNING * INTO _row;

  RETURN _row;
END; $$;

-- ============ 2. CONQUISTAS ============
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'geral',
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0 AND xp_reward <= 5000),
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements are public" ON public.achievements FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements select" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ 3. ESTATÍSTICAS / STREAK ============
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plays_total integer NOT NULL DEFAULT 0,
  records_total integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  games_played text[] NOT NULL DEFAULT '{}',
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stats select" ON public.user_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_stats_updated_at BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 4. DESAFIO DIÁRIO ============
CREATE TABLE public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('score', 'plays', 'games')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target integer NOT NULL CHECK (target > 0),
  game_slug text REFERENCES public.games(slug) ON DELETE CASCADE,
  xp_reward integer NOT NULL DEFAULT 50 CHECK (xp_reward >= 0 AND xp_reward <= 5000),
  sort_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_challenges TO anon, authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily challenges are public" ON public.daily_challenges FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.user_daily_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  plays integer NOT NULL DEFAULT 0,
  played_slugs text[] NOT NULL DEFAULT '{}',
  challenge_slug text,
  challenge_progress integer NOT NULL DEFAULT 0,
  challenge_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);
GRANT SELECT ON public.user_daily_activity TO authenticated;
GRANT ALL ON public.user_daily_activity TO service_role;
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily activity select" ON public.user_daily_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_daily_activity_updated_at BEFORE UPDATE ON public.user_daily_activity
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Desafio do dia: determinístico pela data (sem depender do cliente).
CREATE OR REPLACE FUNCTION public.daily_challenge_for(_date date)
RETURNS public.daily_challenges LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.daily_challenges; _count integer; _idx integer;
BEGIN
  SELECT count(*) INTO _count FROM public.daily_challenges WHERE is_active;
  IF _count = 0 THEN RETURN NULL; END IF;
  _idx := (_date - DATE '2026-01-01') % _count;
  IF _idx < 0 THEN _idx := _idx + _count; END IF;
  SELECT * INTO _row FROM public.daily_challenges WHERE is_active
   ORDER BY sort_order OFFSET _idx LIMIT 1;
  RETURN _row;
END; $$;

-- ============ 5. PROCESSAMENTO DE EVENTO DE PARTIDA ============
CREATE OR REPLACE FUNCTION public.evaluate_achievements_for(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _stats public.user_stats;
  _profile public.profiles;
  _playable integer;
  _in_ranking boolean;
  _unlocked jsonb := '[]'::jsonb;
  _ach public.achievements;
  _ok boolean;
BEGIN
  SELECT * INTO _stats FROM public.user_stats WHERE user_id = _user_id;
  SELECT * INTO _profile FROM public.profiles WHERE id = _user_id;
  IF _stats.user_id IS NULL OR _profile.id IS NULL THEN RETURN _unlocked; END IF;
  SELECT count(*) INTO _playable FROM public.games WHERE state = 'playable';
  SELECT EXISTS (SELECT 1 FROM public.leaderboard_entries WHERE user_id = _user_id) INTO _in_ranking;

  FOR _ach IN
    SELECT a.* FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = _user_id AND ua.achievement_id = a.id)
    ORDER BY a.sort_order
  LOOP
    _ok := CASE _ach.slug
      WHEN 'first_game'    THEN _stats.plays_total >= 1
      WHEN 'first_record'  THEN _stats.records_total >= 1
      WHEN 'player_10'     THEN _stats.plays_total >= 10
      WHEN 'persistent_25' THEN _stats.plays_total >= 25
      WHEN 'competitor'    THEN _in_ranking
      WHEN 'level_5'       THEN _profile.level >= 5
      WHEN 'explorer_3'    THEN coalesce(array_length(_stats.games_played, 1), 0) >= 3
      WHEN 'arcade_master' THEN _playable > 0 AND coalesce(array_length(_stats.games_played, 1), 0) >= _playable
      WHEN 'streak_3'      THEN _stats.current_streak >= 3
      ELSE false
    END;

    IF _ok THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (_user_id, _ach.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      -- XP só é concedido quando a linha realmente foi criada agora (idempotência).
      IF FOUND THEN
        IF _ach.xp_reward > 0 THEN
          PERFORM public.grant_xp_for(_user_id, _ach.xp_reward);
        END IF;
        _unlocked := _unlocked || jsonb_build_object(
          'slug', _ach.slug, 'name', _ach.name, 'icon', _ach.icon,
          'description', _ach.description, 'xpReward', _ach.xp_reward);
      END IF;
    END IF;
  END LOOP;

  RETURN _unlocked;
END; $$;

CREATE OR REPLACE FUNCTION public.process_game_result_for(
  _user_id uuid, _game_slug text, _score integer, _is_record boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'America/Recife')::date;
  _premium boolean;
  _level_before integer;
  _xp_gain integer;
  _stats public.user_stats;
  _act public.user_daily_activity;
  _challenge public.daily_challenges;
  _progress integer := 0;
  _challenge_reward integer := 0;
  _challenge_completed boolean := false;
  _profile public.profiles;
  _unlocked jsonb;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF _score IS NULL OR _score < 0 THEN _score := 0; END IF;
  IF _score > 100000000 THEN _score := 100000000; END IF;

  SELECT level, plano_status = 'premium' INTO _level_before, _premium
    FROM public.profiles WHERE id = _user_id;
  IF _level_before IS NULL THEN RAISE EXCEPTION 'missing profile'; END IF;

  -- Estatísticas + streak (o banco decide se a sequência sobe, mantém ou reinicia).
  INSERT INTO public.user_stats (user_id, plays_total, records_total, best_score, games_played,
                                 current_streak, longest_streak, last_activity_date)
  VALUES (_user_id, 1, CASE WHEN _is_record THEN 1 ELSE 0 END, _score, ARRAY[_game_slug], 1, 1, _today)
  ON CONFLICT (user_id) DO UPDATE SET
    plays_total = public.user_stats.plays_total + 1,
    records_total = public.user_stats.records_total + CASE WHEN _is_record THEN 1 ELSE 0 END,
    best_score = GREATEST(public.user_stats.best_score, _score),
    games_played = CASE WHEN _game_slug = ANY (public.user_stats.games_played)
                        THEN public.user_stats.games_played
                        ELSE public.user_stats.games_played || _game_slug END,
    current_streak = CASE
      WHEN public.user_stats.last_activity_date = _today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_activity_date = _today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1 END,
    longest_streak = GREATEST(public.user_stats.longest_streak, CASE
      WHEN public.user_stats.last_activity_date = _today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_activity_date = _today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1 END),
    last_activity_date = _today
  RETURNING * INTO _stats;

  -- XP da partida: quantidade definida pelo servidor, nunca pelo cliente.
  _xp_gain := GREATEST(1, LEAST(2000, _score / 10)) * CASE WHEN _premium THEN 2 ELSE 1 END;
  PERFORM public.grant_xp_for(_user_id, _xp_gain);

  -- Atividade do dia + desafio diário.
  _challenge := public.daily_challenge_for(_today);
  INSERT INTO public.user_daily_activity (user_id, activity_date, plays, played_slugs, challenge_slug)
  VALUES (_user_id, _today, 1, ARRAY[_game_slug], _challenge.slug)
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    plays = public.user_daily_activity.plays + 1,
    played_slugs = CASE WHEN _game_slug = ANY (public.user_daily_activity.played_slugs)
                        THEN public.user_daily_activity.played_slugs
                        ELSE public.user_daily_activity.played_slugs || _game_slug END,
    challenge_slug = COALESCE(public.user_daily_activity.challenge_slug, _challenge.slug)
  RETURNING * INTO _act;

  IF _challenge.slug IS NOT NULL AND _act.challenge_slug = _challenge.slug THEN
    _progress := CASE _challenge.type
      WHEN 'plays' THEN _act.plays
      WHEN 'games' THEN coalesce(array_length(_act.played_slugs, 1), 0)
      WHEN 'score' THEN CASE WHEN _challenge.game_slug IS NULL OR _challenge.game_slug = _game_slug
                             THEN GREATEST(_act.challenge_progress, _score)
                             ELSE _act.challenge_progress END
      ELSE 0 END;

    UPDATE public.user_daily_activity
       SET challenge_progress = GREATEST(challenge_progress, _progress),
           challenge_completed_at = CASE
             WHEN challenge_completed_at IS NOT NULL THEN challenge_completed_at
             WHEN _progress >= _challenge.target THEN now()
             ELSE NULL END
     WHERE user_id = _user_id AND activity_date = _today
       AND (challenge_completed_at IS NULL OR challenge_progress < _progress)
    RETURNING * INTO _act;

    -- Recompensa concedida só na transição para concluído.
    IF _act.user_id IS NOT NULL AND _act.challenge_completed_at IS NOT NULL
       AND _challenge.xp_reward > 0 THEN
      SELECT * INTO _act FROM public.user_daily_activity
       WHERE user_id = _user_id AND activity_date = _today;
    END IF;
  END IF;

  -- Marca a recompensa como paga usando uma coluna de controle implícita:
  -- concede XP apenas quando o desafio acabou de ser concluído nesta chamada.
  SELECT * INTO _act FROM public.user_daily_activity WHERE user_id = _user_id AND activity_date = _today;
  IF _challenge.slug IS NOT NULL AND _act.challenge_completed_at IS NOT NULL
     AND _act.challenge_slug = _challenge.slug
     AND NOT EXISTS (
       SELECT 1 FROM public.user_challenge_rewards r
       WHERE r.user_id = _user_id AND r.activity_date = _today) THEN
    INSERT INTO public.user_challenge_rewards (user_id, activity_date, challenge_slug, xp_reward)
    VALUES (_user_id, _today, _challenge.slug, _challenge.xp_reward)
    ON CONFLICT (user_id, activity_date) DO NOTHING;
    IF FOUND AND _challenge.xp_reward > 0 THEN
      PERFORM public.grant_xp_for(_user_id, _challenge.xp_reward);
      _challenge_reward := _challenge.xp_reward;
      _challenge_completed := true;
    END IF;
  END IF;

  _unlocked := public.evaluate_achievements_for(_user_id);

  SELECT * INTO _profile FROM public.profiles WHERE id = _user_id;

  RETURN jsonb_build_object(
    'xpGained', _xp_gain,
    'xp', _profile.xp,
    'level', _profile.level,
    'levelUp', _profile.level > _level_before,
    'previousLevel', _level_before,
    'currentStreak', _stats.current_streak,
    'longestStreak', _stats.longest_streak,
    'challengeCompleted', _challenge_completed,
    'challengeXp', _challenge_reward,
    'unlocked', _unlocked
  );
END; $$;

CREATE TABLE public.user_challenge_rewards (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  challenge_slug text NOT NULL,
  xp_reward integer NOT NULL DEFAULT 0,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);
GRANT SELECT ON public.user_challenge_rewards TO authenticated;
GRANT ALL ON public.user_challenge_rewards TO service_role;
ALTER TABLE public.user_challenge_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challenge rewards select" ON public.user_challenge_rewards FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ 6. ESTADO DE GAMIFICAÇÃO (leitura agrupada) ============
CREATE OR REPLACE FUNCTION public.get_gamification_state_for(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'America/Recife')::date;
  _stats public.user_stats;
  _profile public.profiles;
  _challenge public.daily_challenges;
  _act public.user_daily_activity;
  _playable integer;
  _in_ranking boolean;
  _achievements jsonb;
BEGIN
  SELECT * INTO _profile FROM public.profiles WHERE id = _user_id;
  SELECT * INTO _stats FROM public.user_stats WHERE user_id = _user_id;
  SELECT count(*) INTO _playable FROM public.games WHERE state = 'playable';
  SELECT EXISTS (SELECT 1 FROM public.leaderboard_entries WHERE user_id = _user_id) INTO _in_ranking;
  _challenge := public.daily_challenge_for(_today);
  SELECT * INTO _act FROM public.user_daily_activity WHERE user_id = _user_id AND activity_date = _today;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'slug', a.slug, 'name', a.name, 'description', a.description, 'icon', a.icon,
      'category', a.category, 'xpReward', a.xp_reward, 'hidden', a.is_hidden,
      'unlockedAt', ua.unlocked_at,
      'progress', CASE a.slug
        WHEN 'first_game'    THEN LEAST(coalesce(_stats.plays_total, 0), 1)
        WHEN 'first_record'  THEN LEAST(coalesce(_stats.records_total, 0), 1)
        WHEN 'player_10'     THEN LEAST(coalesce(_stats.plays_total, 0), 10)
        WHEN 'persistent_25' THEN LEAST(coalesce(_stats.plays_total, 0), 25)
        WHEN 'competitor'    THEN CASE WHEN _in_ranking THEN 1 ELSE 0 END
        WHEN 'level_5'       THEN LEAST(coalesce(_profile.level, 1), 5)
        WHEN 'explorer_3'    THEN LEAST(coalesce(array_length(_stats.games_played, 1), 0), 3)
        WHEN 'arcade_master' THEN LEAST(coalesce(array_length(_stats.games_played, 1), 0), _playable)
        WHEN 'streak_3'      THEN LEAST(coalesce(_stats.current_streak, 0), 3)
        ELSE 0 END,
      'target', CASE a.slug
        WHEN 'player_10'     THEN 10
        WHEN 'persistent_25' THEN 25
        WHEN 'level_5'       THEN 5
        WHEN 'explorer_3'    THEN 3
        WHEN 'arcade_master' THEN _playable
        WHEN 'streak_3'      THEN 3
        ELSE 1 END
    ) ORDER BY a.sort_order), '[]'::jsonb)
  INTO _achievements
  FROM public.achievements a
  LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = _user_id;

  RETURN jsonb_build_object(
    'xp', coalesce(_profile.xp, 0),
    'level', coalesce(_profile.level, 1),
    'stats', jsonb_build_object(
      'playsTotal', coalesce(_stats.plays_total, 0),
      'recordsTotal', coalesce(_stats.records_total, 0),
      'bestScore', coalesce(_stats.best_score, 0),
      'gamesPlayed', coalesce(_stats.games_played, '{}'::text[]),
      'currentStreak', coalesce(_stats.current_streak, 0),
      'longestStreak', coalesce(_stats.longest_streak, 0),
      'lastActivityDate', _stats.last_activity_date
    ),
    'challenge', CASE WHEN _challenge.slug IS NULL THEN NULL ELSE jsonb_build_object(
      'slug', _challenge.slug, 'type', _challenge.type, 'title', _challenge.title,
      'description', _challenge.description, 'target', _challenge.target,
      'gameSlug', _challenge.game_slug, 'xpReward', _challenge.xp_reward,
      'progress', CASE WHEN _act.challenge_slug = _challenge.slug THEN _act.challenge_progress ELSE 0 END,
      'completedAt', CASE WHEN _act.challenge_slug = _challenge.slug THEN _act.challenge_completed_at ELSE NULL END
    ) END,
    'achievements', _achievements
  );
END; $$;

-- Nada de gamificação é executável pelo cliente: só via server function (service_role).
REVOKE ALL ON FUNCTION public.process_game_result_for(uuid, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_achievements_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_gamification_state_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_challenge_for(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_game_result_for(uuid, text, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_achievements_for(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_gamification_state_for(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_challenge_for(date) TO service_role;

-- ============ 7. SEEDS ============
INSERT INTO public.achievements (slug, name, description, icon, category, xp_reward, is_hidden, sort_order) VALUES
  ('first_game',    'Primeiro Jogo',  'Jogue sua primeira partida no Oásis.', 'gamepad',  'inicio',    25,  false, 1),
  ('first_record',  'Primeiro Recorde','Registre seu primeiro recorde pessoal.', 'target',  'recordes',  50,  false, 2),
  ('player_10',     'Jogador',        'Jogue 10 partidas.',                  'joystick', 'partidas',  75,  false, 3),
  ('persistent_25', 'Persistente',    'Jogue 25 partidas.',                  'flame',    'partidas',  150, false, 4),
  ('competitor',    'Competidor',     'Apareça no ranking de pelo menos um jogo.', 'trophy', 'ranking', 100, false, 5),
  ('level_5',       'Nível 5',        'Alcance o nível 5.',                  'star',     'progresso', 120, false, 6),
  ('explorer_3',    'Explorador',     'Jogue pelo menos 3 jogos diferentes.','compass',  'catalogo',  100, false, 7),
  ('arcade_master', 'Arcade Master',  'Jogue todos os jogos disponíveis.',   'crown',    'catalogo',  300, false, 8),
  ('streak_3',      'Chama Acesa',    'Mantenha 3 dias seguidos de jogo.',   'flame',    'streak',    150, true,  9);

INSERT INTO public.daily_challenges (slug, type, title, description, target, game_slug, xp_reward, sort_order) VALUES
  ('plays_3',        'plays', 'Aquecimento',    'Jogue 3 partidas hoje.',              3, NULL,     60, 1),
  ('games_2',        'games', 'Variedade',      'Jogue 2 jogos diferentes hoje.',      2, NULL,     70, 2),
  ('snake_500',      'score', 'Snake veloz',    'Faça 500 pontos no Snake.',           500, 'snake', 90, 3),
  ('tetris_1000',    'score', 'Linhas em série','Faça 1000 pontos no Tetris.',         1000, 'tetris', 100, 4),
  ('memoria_300',    'score', 'Memória afiada', 'Faça 300 pontos no Jogo da Memória.', 300, 'memoria', 80, 5),
  ('plays_5',        'plays', 'Maratona',       'Jogue 5 partidas hoje.',              5, NULL,     110, 6),
  ('games_3',        'games', 'Explorador do dia','Jogue 3 jogos diferentes hoje.',    3, NULL,     120, 7);