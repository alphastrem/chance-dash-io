-- Add prize_image_url to games table
ALTER TABLE public.games 
ADD COLUMN prize_image_url TEXT;

-- Update default status for new games to 'open'
ALTER TABLE public.games 
ALTER COLUMN status SET DEFAULT 'open'::game_status;

-- Create storage bucket for prize images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('prize-images', 'prize-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for prize images
CREATE POLICY "Prize images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'prize-images');

CREATE POLICY "Hosts can upload prize images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'prize-images' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'host'::app_role))
);

CREATE POLICY "Hosts can update prize images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'prize-images' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'host'::app_role))
);

CREATE POLICY "Hosts can delete prize images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'prize-images' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'host'::app_role))
);

-- Update public_winners view to include GDPR-obfuscated last name
DROP VIEW IF EXISTS public.public_winners;

CREATE VIEW public.public_winners
WITH (security_invoker = true)
AS
SELECT 
  g.id AS game_id,
  g.name AS game_name,
  g.code6 AS game_code,
  g.prize_image_url,
  d.executed_at AS draw_date,
  p.first_name,
  -- GDPR protection: obfuscate after 2nd character
  CASE 
    WHEN LENGTH(p.last_name) <= 2 THEN p.last_name
    ELSE SUBSTRING(p.last_name FROM 1 FOR 2) || '...<GDPR Protection>'
  END AS last_name_protected,
  t.number AS ticket_number
FROM games g
JOIN draws d ON d.game_id = g.id
JOIN tickets t ON t.id = d.winner_ticket_id
JOIN players p ON p.id = t.player_id
WHERE g.status IN ('drawn', 'closed');