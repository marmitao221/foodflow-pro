
CREATE OR REPLACE FUNCTION public.next_order_number(_company_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT private.is_company_member(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.order_counters(company_id, last_number) VALUES (_company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = order_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_order_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_order_number(uuid) TO authenticated;
