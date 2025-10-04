-- Create prompt library table
CREATE TABLE public.prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  model_recommendation TEXT,
  performance_score NUMERIC(3,2),
  token_count INTEGER,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create templates table
CREATE TABLE public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  industry TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  rating NUMERIC(2,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create knowledge bases table
CREATE TABLE public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prompt evaluations table
CREATE TABLE public.prompt_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES public.prompt_library(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quality_score NUMERIC(3,2),
  token_efficiency NUMERIC(3,2),
  clarity_score NUMERIC(3,2),
  completeness_score NUMERIC(3,2),
  test_results JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workflows table
CREATE TABLE public.prompt_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_workflows ENABLE ROW LEVEL SECURITY;

-- Prompt Library Policies
CREATE POLICY "Users can view their own prompts"
  ON public.prompt_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prompts"
  ON public.prompt_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON public.prompt_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON public.prompt_library FOR DELETE
  USING (auth.uid() = user_id);

-- Templates Policies
CREATE POLICY "Everyone can view public templates"
  ON public.prompt_templates FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create templates"
  ON public.prompt_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON public.prompt_templates FOR UPDATE
  USING (auth.uid() = created_by);

-- Knowledge Bases Policies
CREATE POLICY "Users can view their own knowledge bases"
  ON public.knowledge_bases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge bases"
  ON public.knowledge_bases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge bases"
  ON public.knowledge_bases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge bases"
  ON public.knowledge_bases FOR DELETE
  USING (auth.uid() = user_id);

-- Evaluations Policies
CREATE POLICY "Users can view their own evaluations"
  ON public.prompt_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evaluations"
  ON public.prompt_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Workflows Policies
CREATE POLICY "Users can view their own workflows"
  ON public.prompt_workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
  ON public.prompt_workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.prompt_workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.prompt_workflows FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_prompt_library_user_id ON public.prompt_library(user_id);
CREATE INDEX idx_prompt_library_tags ON public.prompt_library USING GIN(tags);
CREATE INDEX idx_prompt_library_category ON public.prompt_library(category);
CREATE INDEX idx_prompt_templates_category ON public.prompt_templates(category);
CREATE INDEX idx_knowledge_bases_user_id ON public.knowledge_bases(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_prompt_library_updated_at
  BEFORE UPDATE ON public.prompt_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.prompt_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some starter templates
INSERT INTO public.prompt_templates (name, description, category, industry, content, variables) VALUES
('Customer Support AI', 'AI assistant for handling customer inquiries', 'Customer Service', 'General', '# Role: Customer Support Specialist AI\n\n## Objective:\nProvide helpful, empathetic customer support\n\n## Instructions:\n1. Greet warmly\n2. Listen actively\n3. Provide solutions\n4. Follow up', '["company_name", "product_type"]'),
('Content Generator', 'Generate high-quality content', 'Content Creation', 'Marketing', '# Role: Content Creation Expert\n\n## Objective:\nCreate engaging, SEO-optimized content\n\n## Instructions:\n1. Research topic thoroughly\n2. Structure with clear headings\n3. Include actionable insights', '["topic", "tone", "target_audience"]'),
('Code Assistant', 'Help with coding tasks', 'Development', 'Technology', '# Role: Senior Software Engineer\n\n## Objective:\nProvide clear, efficient code solutions\n\n## Instructions:\n1. Understand requirements\n2. Write clean code\n3. Add comments\n4. Suggest improvements', '["programming_language", "framework"]'),
('Data Analyst', 'Analyze and interpret data', 'Analytics', 'Business', '# Role: Data Analysis Expert\n\n## Objective:\nExtract insights from data\n\n## Instructions:\n1. Clean and validate data\n2. Identify patterns\n3. Create visualizations\n4. Provide recommendations', '["data_type", "business_question"]');