CREATE OR REPLACE FUNCTION public.orders_apply_fee_discount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.total := GREATEST(COALESCE(NEW.subtotal,0) + COALESCE(NEW.service_fee,0) - COALESCE(NEW.discount,0), 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_totals ON public.orders;
CREATE TRIGGER trg_orders_totals
BEFORE INSERT OR UPDATE OF subtotal, service_fee, discount ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_apply_fee_discount();

UPDATE public.orders
SET total = GREATEST(COALESCE(subtotal,0) + COALESCE(service_fee,0) - COALESCE(discount,0), 0)
WHERE total IS DISTINCT FROM GREATEST(COALESCE(subtotal,0) + COALESCE(service_fee,0) - COALESCE(discount,0), 0);