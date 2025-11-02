-- Fix 1: Player PII Exposure - Create public winners view and restrict access

-- Drop overly permissive policy that exposes all player data
DROP POLICY IF EXISTS "Public can view players in completed draws only" ON players;

-- Create view that only exposes winner names (no PII like email/phone)
CREATE OR REPLACE VIEW public.public_winners AS
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

-- Restrict direct player table access to hosts only (protects email and phone)
CREATE POLICY "Only hosts can view player PII"
ON players FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = players.game_id
    AND (games.created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'host'))
  )
);