
CREATE TABLE public.agent_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text NOT NULL,
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  price_tier text DEFAULT 'subscription',
  is_published boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view free published listings"
  ON public.agent_listings FOR SELECT
  USING (is_published = true AND price_tier = 'free');

CREATE POLICY "Authenticated users can view subscription listings"
  ON public.agent_listings FOR SELECT
  TO authenticated
  USING (is_published = true AND price_tier = 'subscription');

CREATE POLICY "Creators can manage own listings"
  ON public.agent_listings FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE TRIGGER update_agent_listings_updated_at
  BEFORE UPDATE ON public.agent_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
