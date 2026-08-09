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
  _pass integer := 0;
  _found_any boolean;
BEGIN
  SELECT count(*) INTO _playable FROM public.games WHERE state = 'playable';
  SELECT EXISTS (SELECT 1 FROM public.leaderboard_entries WHERE user_id = _user_id) INTO _in_ranking;

  LOOP
    _pass := _pass + 1;
    _found_any := false;
    SELECT * INTO _stats FROM public.user_stats WHERE user_id = _user_id;
    SELECT * INTO _profile FROM public.profiles WHERE id = _user_id;
    IF _stats.user_id IS NULL OR _profile.id IS NULL THEN RETURN _unlocked; END IF;

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
        IF FOUND THEN
          _found_any := true;
          IF _ach.xp_reward > 0 THEN
            PERFORM public.grant_xp_for(_user_id, _ach.xp_reward);
          END IF;
          _unlocked := _unlocked || jsonb_build_object(
            'slug', _ach.slug, 'name', _ach.name, 'icon', _ach.icon,
            'description', _ach.description, 'xpReward', _ach.xp_reward);
        END IF;
      END IF;
    END LOOP;

    EXIT WHEN NOT _found_any OR _pass >= 3;
  END LOOP;

  RETURN _unlocked;
END; $$;

REVOKE ALL ON FUNCTION public.evaluate_achievements_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_achievements_for(uuid) TO service_role;

DELETE FROM public.user_challenge_rewards WHERE challenge_slug = 'smoketest';