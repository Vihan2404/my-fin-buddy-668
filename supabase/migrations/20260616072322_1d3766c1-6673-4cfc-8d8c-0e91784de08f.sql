CREATE OR REPLACE FUNCTION public.apply_txn_to_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.account_id IS NOT NULL THEN
      delta := CASE NEW.type WHEN 'income' THEN NEW.amount WHEN 'expense' THEN -NEW.amount ELSE 0 END;
      UPDATE public.accounts SET balance = balance + delta WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.account_id IS NOT NULL THEN
      delta := CASE OLD.type WHEN 'income' THEN -OLD.amount WHEN 'expense' THEN OLD.amount ELSE 0 END;
      UPDATE public.accounts SET balance = balance + delta WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.account_id IS NOT NULL THEN
      delta := CASE OLD.type WHEN 'income' THEN -OLD.amount WHEN 'expense' THEN OLD.amount ELSE 0 END;
      UPDATE public.accounts SET balance = balance + delta WHERE id = OLD.account_id;
    END IF;
    IF NEW.account_id IS NOT NULL THEN
      delta := CASE NEW.type WHEN 'income' THEN NEW.amount WHEN 'expense' THEN -NEW.amount ELSE 0 END;
      UPDATE public.accounts SET balance = balance + delta WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_txn_to_balance ON public.transactions;
CREATE TRIGGER trg_apply_txn_to_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_txn_to_balance();