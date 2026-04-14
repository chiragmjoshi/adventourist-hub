

## Plan: Re-enable Trigger & Delete Bulk-SQL Function

### Steps

1. **Create a migration** to re-enable the `generate_traveller_code` trigger on the `leads` table:
   ```sql
   CREATE TRIGGER generate_traveller_code_trigger
     BEFORE INSERT ON public.leads
     FOR EACH ROW
     WHEN (NEW.traveller_code IS NULL OR NEW.traveller_code = '')
     EXECUTE FUNCTION public.generate_traveller_code();
   ```

2. **Delete the `bulk-sql` edge function** — remove `supabase/functions/bulk-sql/index.ts` from codebase and call the delete tool to remove the deployed function.

### Why the WHEN clause
Historical leads already have `traveller_code` values. The trigger should only fire for new leads where the code is missing, preserving existing data.

