-- Fix: los triggers de auditoría fallaban por RLS en nablijven_audit_logs
-- Ejecutar en SQL Editor del proyecto Chill Outs

CREATE OR REPLACE FUNCTION public.nablijven_create_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.nablijven_audit_logs (id, table_name, record_id, action, new_data, changed_at)
    VALUES ('audit-' || gen_random_uuid()::text, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.nablijven_audit_logs (id, table_name, record_id, action, old_data, new_data, changed_at)
    VALUES ('audit-' || gen_random_uuid()::text, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.nablijven_audit_logs (id, table_name, record_id, action, old_data, changed_at)
    VALUES ('audit-' || gen_random_uuid()::text, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NOW());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
