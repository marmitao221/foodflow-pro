CREATE TABLE public.delivery_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'ifood',
  merchant_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, merchant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_integrations TO authenticated;
GRANT ALL ON public.delivery_integrations TO service_role;
ALTER TABLE public.delivery_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY di_select ON public.delivery_integrations FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY di_write ON public.delivery_integrations FOR ALL TO authenticated USING (private.is_company_admin(auth.uid(), company_id)) WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE TABLE public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  display_id text,
  amount numeric NOT NULL DEFAULT 0,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
GRANT SELECT ON public.delivery_orders TO authenticated;
GRANT ALL ON public.delivery_orders TO service_role;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY do_select ON public.delivery_orders FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));

-- Registers a delivery sale as a closed order + payment in the given cash session
CREATE OR REPLACE FUNCTION public.register_delivery_sale(_session_id uuid, _method public.payment_method, _amount numeric, _ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; _num int; _oid uuid := gen_random_uuid(); _label text;
BEGIN
  SELECT * INTO s FROM public.cash_sessions WHERE id = _session_id AND status = 'aberto';
  IF s IS NULL THEN RAISE EXCEPTION 'Caixa não está aberto'; END IF;
  IF auth.uid() IS NOT NULL AND NOT private.is_company_member(auth.uid(), s.company_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  _label := CASE _method WHEN 'ifood_online' THEN 'iFood' WHEN 'keeta_online' THEN 'Keeta'
    WHEN 'aiqfome_online' THEN 'Aiqfome' WHEN 'ninetynine_online' THEN '99Food' ELSE 'Delivery' END;
  _num := public.next_order_number(s.company_id);
  INSERT INTO public.orders (id, company_id, branch_id, number, type, customer_name, notes)
  VALUES (_oid, s.company_id, s.branch_id, _num, 'delivery',
    _label || COALESCE(' #' || NULLIF(_ref, ''), ''), 'Venda ' || _label);
  INSERT INTO public.order_items (order_id, company_id, product_name, quantity, unit_price, total)
  VALUES (_oid, s.company_id, 'Pedido ' || _label || COALESCE(' #' || NULLIF(_ref, ''), ''), 1, _amount, _amount);
  UPDATE public.orders SET status = 'fechada', closed_at = now() WHERE id = _oid;
  INSERT INTO public.order_payments (company_id, order_id, session_id, method, amount)
  VALUES (s.company_id, _oid, _session_id, _method, _amount);
  RETURN _oid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_delivery_sale(uuid, public.payment_method, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_delivery_sale(uuid, public.payment_method, numeric, text) TO authenticated, service_role;

-- Posts pending automatic delivery orders into a newly opened session
CREATE OR REPLACE FUNCTION public.flush_pending_delivery(_session_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; d record; n int := 0; _oid uuid;
BEGIN
  SELECT * INTO s FROM public.cash_sessions WHERE id = _session_id AND status = 'aberto';
  IF s IS NULL OR s.branch_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS NOT NULL AND NOT private.is_company_member(auth.uid(), s.company_id) THEN RETURN 0; END IF;
  FOR d IN SELECT * FROM public.delivery_orders WHERE branch_id = s.branch_id AND order_id IS NULL AND amount > 0 FOR UPDATE LOOP
    _oid := public.register_delivery_sale(_session_id,
      CASE d.provider WHEN 'ifood' THEN 'ifood_online'::public.payment_method WHEN 'keeta' THEN 'keeta_online' WHEN '99food' THEN 'ninetynine_online' ELSE 'aiqfome_online' END,
      d.amount, COALESCE(d.display_id, d.external_id));
    UPDATE public.delivery_orders SET order_id = _oid, session_id = _session_id WHERE id = d.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.flush_pending_delivery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flush_pending_delivery(uuid) TO authenticated, service_role;