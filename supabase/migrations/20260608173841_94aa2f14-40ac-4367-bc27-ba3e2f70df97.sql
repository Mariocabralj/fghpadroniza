
-- System prompt singleton
CREATE TABLE public.ai_system_prompt (
  id text PRIMARY KEY DEFAULT 'global',
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_system_prompt_singleton CHECK (id = 'global')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_system_prompt TO authenticated;
GRANT ALL ON public.ai_system_prompt TO service_role;
ALTER TABLE public.ai_system_prompt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage system prompt" ON public.ai_system_prompt
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_system_prompt (id, content) VALUES ('global', '') ON CONFLICT DO NOTHING;

-- Few-shot examples
CREATE TABLE public.ai_few_shot_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  doc_type text,
  input_text text NOT NULL,
  ideal_output text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_few_shot_examples TO authenticated;
GRANT ALL ON public.ai_few_shot_examples TO service_role;
ALTER TABLE public.ai_few_shot_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage few-shot" ON public.ai_few_shot_examples
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ai_few_shot_updated_at BEFORE UPDATE ON public.ai_few_shot_examples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Snapshots
CREATE TABLE public.ai_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  payload jsonb NOT NULL,
  diff jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_snapshots TO authenticated;
GRANT ALL ON public.ai_snapshots TO service_role;
ALTER TABLE public.ai_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage snapshots" ON public.ai_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
