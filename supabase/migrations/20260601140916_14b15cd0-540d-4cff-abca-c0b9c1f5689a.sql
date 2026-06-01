ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS salary_opt_out BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, role, sector, email, salary, salary_opt_out)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'sector',
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'salary','')::numeric,
    COALESCE((NEW.raw_user_meta_data->>'salary_opt_out')::boolean, false)
  );

  IF lower(NEW.email) = 'mario.cabral@hps.fghsaude.org.br' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;