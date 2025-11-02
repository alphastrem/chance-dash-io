-- Fix the SECURITY DEFINER view issue
-- Recreate the view without SECURITY DEFINER (views shouldn't use this)

DROP VIEW IF EXISTS public.public_winners;

CREATE VIEW public.public_winners 
WITH (security_invoker = true) AS
SELECT 
  p.first_name,
  p.last_name,
  t.number as ticket_number,
  g.name as game_name,
  g.code6 as game_code,
  g.id as game_id,
  d.executed_at as draw_date
FROM players p
JOIN tickets t ON t.player_id = p.id
JOIN draws d ON d.winner_ticket_id = t.id
JOIN games g ON g.id = p.game_id
WHERE g.status IN ('drawn', 'closed');