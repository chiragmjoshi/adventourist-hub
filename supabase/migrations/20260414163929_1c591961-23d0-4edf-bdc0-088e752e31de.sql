CREATE TRIGGER generate_traveller_code_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  WHEN (NEW.traveller_code IS NULL OR NEW.traveller_code = '')
  EXECUTE FUNCTION public.generate_traveller_code();