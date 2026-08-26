import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";

export type ProductCategory =
  | "refeicao"
  | "marmita"
  | "bebida"
  | "sobremesa"
  | "lanche"
  | "porcao"
  | "adicional";

export type TableStatus = "livre" | "ocupada" | "reservada" | "fechamento_pendente";

export type OrderType = "mesa" | "balcao" | "delivery" | "retirada";
export type OrderStatus = "aberta" | "fechada" | "cancelada";
export type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "debito"
  | "credito"
  | "ifood_online"
  | "keeta_online"
  | "aiqfome_online"
  | "conta_cliente";
export type CashMovementType = "sangria" | "suprimento" | "retirada" | "ajuste";
export type CashSessionStatus = "aberto" | "fechado";

export const orderTypeLabel: Record<OrderType, string> = {
  mesa: "Mesa",
  balcao: "Balcão",
  delivery: "Delivery",
  retirada: "Retirada",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Cartão débito",
  credito: "Cartão crédito",
  ifood_online: "iFood Online",
  keeta_online: "Keeta Online",
  aiqfome_online: "Aiqfome Online",
};

export const cashMovementLabel: Record<CashMovementType, string> = {
  sangria: "Sangria",
  suprimento: "Suprimento",
  retirada: "Retirada",
  ajuste: "Ajuste",
};

export type Product = {
  id: string;
  company_id: string;
  name: string;
  category: ProductCategory;
  sku: string | null;
  description: string | null;
  price: number;
  cost: number;
  unit: string;
  stock: number;
  min_stock: number;
  image_url: string | null;
  is_active: boolean;
};

export type RestaurantTable = {
  id: string;
  company_id: string;
  branch_id: string | null;
  number: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
};

export const productCategoryLabel: Record<ProductCategory, string> = {
  refeicao: "Refeições",
  marmita: "Marmitas",
  bebida: "Bebidas",
  sobremesa: "Sobremesas",
  lanche: "Lanches",
  porcao: "Porções",
  adicional: "Adicionais",
};

export const tableStatusLabel: Record<TableStatus, string> = {
  livre: "Livre",
  ocupada: "Ocupada",
  reservada: "Reservada",
  fechamento_pendente: "Fechamento pendente",
};

export const tableStatusClass: Record<TableStatus, string> = {
  livre: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  ocupada: "bg-destructive/15 text-destructive border-destructive/30",
  reservada: "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300",
  fechamento_pendente: "bg-accent/20 text-accent-foreground border-accent/40",
};

export const formatBRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function useMyCompanyId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-company-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("company_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data?.company_id as string | undefined) ?? null;
    },
  });
}
