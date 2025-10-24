-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'host');
CREATE TYPE public.game_status AS ENUM ('draft', 'open', 'locked', 'drawn', 'closed');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code6 CHAR(6) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ticket_price_minor INT NOT NULL DEFAULT 0,
  draw_at TIMESTAMPTZ NOT NULL,
  status game_status DEFAULT 'draft' NOT NULL,
  commit_hash CHAR(64),
  revealed_seed TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Players table (PII will be handled carefully)
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  number INT NOT NULL,
  eligible BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(game_id, number)
);

-- Draws table
CREATE TABLE public.draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  winner_ticket_id UUID REFERENCES public.tickets(id) NOT NULL,
  algorithm TEXT NOT NULL,
  server_version TEXT,
  audit_json JSONB
);

-- Audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_games_code6 ON public.games(code6);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_tickets_game_number ON public.tickets(game_id, number);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_players_game_id ON public.players(game_id);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for games
CREATE POLICY "Hosts can manage their games"
  ON public.games FOR ALL
  TO authenticated
  USING (
    auth.uid() = created_by_user_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'host')
  );

CREATE POLICY "Public can view open/drawn games"
  ON public.games FOR SELECT
  TO anon
  USING (status IN ('open', 'locked', 'drawn', 'closed'));

CREATE POLICY "Authenticated can view all games"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for players
CREATE POLICY "Hosts can manage players in their games"
  ON public.players FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = players.game_id
      AND (
        games.created_by_user_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'host')
      )
    )
  );

CREATE POLICY "Public can view players in drawn games"
  ON public.players FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = players.game_id
      AND games.status IN ('drawn', 'closed')
    )
  );

-- RLS Policies for tickets
CREATE POLICY "Hosts can manage tickets"
  ON public.tickets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = tickets.game_id
      AND (
        games.created_by_user_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'host')
      )
    )
  );

CREATE POLICY "Public can view tickets in drawn games"
  ON public.tickets FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = tickets.game_id
      AND games.status IN ('drawn', 'closed')
    )
  );

-- RLS Policies for draws
CREATE POLICY "Hosts can view draws"
  ON public.draws FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view completed draws"
  ON public.draws FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Only hosts can insert draws"
  ON public.draws FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'host')
  );

-- RLS Policies for audit_logs
CREATE POLICY "Only hosts can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'host')
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for games (for live draw updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draws;