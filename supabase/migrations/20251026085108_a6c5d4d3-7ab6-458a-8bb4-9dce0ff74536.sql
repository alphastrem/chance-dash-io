-- Add max_tickets column to games table
ALTER TABLE public.games 
ADD COLUMN max_tickets integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.games.max_tickets IS 'Maximum number of tickets that can be sold for this game';

-- Fix RLS policy for players - only expose PII after draw is complete
DROP POLICY IF EXISTS "Public can view players in drawn games" ON public.players;

CREATE POLICY "Public can view players in completed draws only"
ON public.players
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = players.game_id
    AND games.status = 'drawn'
  )
);

-- Fix audit_logs RLS to prevent injection - system inserts only via service role
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = actor_user_id);

-- Add has_manual_entries flag to games to prevent CSV conflicts
ALTER TABLE public.games
ADD COLUMN has_manual_entries boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.games.has_manual_entries IS 'Tracks if manual entries were added to prevent CSV upload conflicts';