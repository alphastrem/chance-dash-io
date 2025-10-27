-- Add animation preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN animation_type text NOT NULL DEFAULT 'spinning_wheel'
CHECK (animation_type IN ('spinning_wheel', 'slot_machine', 'roulette', 'lottery_balls', 'flip_counter'));

-- Add comment
COMMENT ON COLUMN public.profiles.animation_type IS 'The draw animation style preference for this host';