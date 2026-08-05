import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChefHat, Search, X, Calculator } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  formatBRL,
  formatPct,
  formatQty,
  type Recipe,
  type RecipeIngredient,
} from "@/lib/fichas";
import { stockUnits } from "@/lib/estoque";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/decimal-input";

export const Route = createFileRoute("/_authenticated/fichas")({
  head: () => ({ meta: [{ title: "Fichas Técnicas — CozinhaPro" }] }),
  component: FichasPage,
});

type StockItemLite = { id: string; name: string; unit: string; unit_value: number };
type ProductLite = { id: string; name: string; price: number };

function FichasPage() {
  const qc = useQueryClient();
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Recipe | null>(null);

  const recipesQ = useQuery({
    queryKey: ["recipes", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("recipes")
        .select("*")
        .eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as Recipe[];
    },
  });

  const productsQ = useQuery({
    queryKey: ["recipes-products", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, price")
        .eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("name");
      return (data ?? []) as ProductLite[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ficha removida");
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = recipesQ.data ?? [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((r) => r.name.toLowerCase().includes(s));
  }, [recipesQ.data, search]);

  const totals = useMemo(() => {
    const list = recipesQ.data ?? [];
    const avgCmv =
      list.length === 0
        ? 0
        : list.reduce((a, r) => a + Number(r.cmv_pct || 0), 0) / list.length;
    const avgMargin =
      list.length === 0
        ? 0
        : list.reduce((a, r) => a + Number(r.margin_pct || 0), 0) / list.length;
    return { count: list.length, avgCmv, avgMargin };
  }, [recipesQ.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fichas Técnicas</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro de receitas com cálculo automático de custo, CMV, margem e
              preço sugerido.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova ficha
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Fichas cadastradas
            </p>
            <p className="mt-1 text-2xl font-bold">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              CMV médio
            </p>
            <p className="mt-1 text-2xl font-bold">{formatPct(totals.avgCmv)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Margem média
            </p>
            <p className="mt-1 text-2xl font-bold">{formatPct(totals.avgMargin)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar receita..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receita</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Custo total</TableHead>
                <TableHead className="text-right">Custo / porção</TableHead>
                <TableHead className="text-right">Preço venda</TableHead>
                <TableHead className="text-right">CMV</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Preço sugerido</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipesQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhuma receita cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setDetailRecipe(r)}
                  >
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {r.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(r.yield_qty)} {r.yield_unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(r.total_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(r.cost_per_portion)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.sale_price > 0 ? formatBRL(r.sale_price) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <CmvBadge value={Number(r.cmv_pct)} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(r.margin_pct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-primary font-medium">
                      {formatBRL(r.suggested_price)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(r)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecipeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipe={editing}
        companyId={companyId ?? null}
        branchId={activeBranchId}
        products={productsQ.data ?? []}
      />

      {detailRecipe && (
        <RecipeDetailDialog
          recipe={detailRecipe}
          onClose={() => setDetailRecipe(null)}
          companyId={companyId ?? null}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ficha técnica?</AlertDialogTitle>
            <AlertDialogDescription>
              A receita "{confirmDelete?.name}" e todos os seus ingredientes serão
              excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CmvBadge({ value }: { value: number }) {
  const v = Number(value || 0);
  const tone =
    v === 0
      ? "secondary"
      : v < 35
      ? "default"
      : v < 50
      ? "secondary"
      : "destructive";
  return <Badge variant={tone as never}>{formatPct(v)}</Badge>;
}

// =====================================================
// Dialog: criar/editar receita
// =====================================================
function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  companyId,
  branchId,
  products,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipe: Recipe | null;
  companyId: string | null;
  branchId: string | null;
  products: ProductLite[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [yieldQty, setYieldQty] = useState(String(recipe?.yield_qty ?? 1));
  const [yieldUnit, setYieldUnit] = useState(recipe?.yield_unit ?? "porção");
  const [salePrice, setSalePrice] = useState(String(recipe?.sale_price ?? 0));
  const [margin, setMargin] = useState(String(recipe?.target_margin_pct ?? 200));
  const [productId, setProductId] = useState<string>(recipe?.product_id ?? "none");
  const [notes, setNotes] = useState(recipe?.notes ?? "");

  // reset form when dialog opens
  useMemo(() => {
    if (open) {
      setName(recipe?.name ?? "");
      setDescription(recipe?.description ?? "");
      setYieldQty(String(recipe?.yield_qty ?? 1));
      setYieldUnit(recipe?.yield_unit ?? "porção");
      setSalePrice(String(recipe?.sale_price ?? 0));
      setMargin(String(recipe?.target_margin_pct ?? 200));
      setProductId(recipe?.product_id ?? "none");
      setNotes(recipe?.notes ?? "");
    }
  }, [open, recipe]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (!name.trim()) throw new Error("Informe o nome da receita");
      const payload = {
        company_id: companyId,
        branch_id: branchId ?? null,
        name: name.trim(),
        description: description.trim() || null,
        yield_qty: Number(yieldQty) || 1,
        yield_unit: yieldUnit.trim() || "porção",
        sale_price: Number(salePrice) || 0,
        target_margin_pct: Number(margin) || 0,
        product_id: productId === "none" ? null : productId,
        notes: notes.trim() || null,
      };
      if (recipe) {
        const { error } = await supabase
          .from("recipes")
          .update(payload)
          .eq("id", recipe.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recipes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(recipe ? "Ficha atualizada" : "Ficha criada");
      qc.invalidateQueries({ queryKey: ["recipes"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar ficha técnica" : "Nova ficha técnica"}</DialogTitle>
          <DialogDescription>
            O custo total é calculado automaticamente a partir dos ingredientes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome da receita</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descrição</Label>
            <Input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rendimento</Label>
            <DecimalInput
              value={yieldQty}
              onValueChange={(v) => setYieldQty(String(v))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unidade do rendimento</Label>
            <Input
              value={yieldUnit}
              onChange={(e) => setYieldUnit(e.target.value)}
              placeholder="porção, kg, un..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preço de venda (R$)</Label>
            <DecimalInput
              decimals={2}
              value={salePrice}
              onValueChange={(v) => setSalePrice(String(v))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Margem alvo (%)</Label>
            <DecimalInput
              decimals={2}
              value={margin}
              onValueChange={(v) => setMargin(String(v))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Produto de venda vinculado (opcional)</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatBRL(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Modo de preparo / observações</Label>
            <Textarea
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Dialog: detalhe + ingredientes
// =====================================================
function RecipeDetailDialog({
  recipe,
  onClose,
  companyId,
}: {
  recipe: Recipe;
  onClose: () => void;
  companyId: string | null;
}) {
  const qc = useQueryClient();

  const ingredientsQ = useQuery({
    queryKey: ["recipe-ingredients", recipe.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipe.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as RecipeIngredient[];
    },
  });

  const stockQ = useQuery({
    queryKey: ["recipe-stock-items", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_items")
        .select("id, name, unit, unit_value")
        .eq("company_id", companyId!)
        .order("name");
      return (data ?? []) as StockItemLite[];
    },
  });

  // form state for new ingredient
  const [itemId, setItemId] = useState<string>("manual");
  const [iname, setIname] = useState("");
  const [iqty, setIqty] = useState("1");
  const [iunit, setIunit] = useState("un");
  const [icost, setIcost] = useState("0");

  const addMut = useMutation({
    mutationFn: async () => {
      if (!iname.trim()) throw new Error("Informe o nome do ingrediente");
      const { error } = await supabase.from("recipe_ingredients").insert({
        recipe_id: recipe.id,
        item_id: itemId === "manual" ? null : itemId,
        name: iname.trim(),
        quantity: Number(iqty) || 0,
        unit: iunit,
        unit_cost: Number(icost) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ingrediente adicionado");
      qc.invalidateQueries({ queryKey: ["recipe-ingredients", recipe.id] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setItemId("manual");
      setIname("");
      setIqty("1");
      setIunit("un");
      setIcost("0");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipe-ingredients", recipe.id] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  // get freshly recomputed recipe values
  const liveRecipeQ = useQuery({
    queryKey: ["recipe-detail", recipe.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", recipe.id)
        .single();
      return data as Recipe;
    },
  });
  const live = liveRecipeQ.data ?? recipe;

  function handleSelectStockItem(id: string) {
    setItemId(id);
    if (id === "manual") return;
    const item = (stockQ.data ?? []).find((i) => i.id === id);
    if (item) {
      setIname(item.name);
      setIunit(item.unit);
      setIcost(String(item.unit_value ?? 0));
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            {recipe.name}
          </DialogTitle>
          <DialogDescription>
            Rendimento: {formatQty(live.yield_qty)} {live.yield_unit}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiBox label="Custo total" value={formatBRL(live.total_cost)} />
          <KpiBox
            label="Custo / porção"
            value={formatBRL(live.cost_per_portion)}
          />
          <KpiBox label="CMV" value={formatPct(live.cmv_pct)} />
          <KpiBox
            label="Preço sugerido"
            value={formatBRL(live.suggested_price)}
            highlight
          />
        </div>

        <div className="rounded-md border border-border">
          <div className="grid gap-2 border-b border-border bg-muted/40 p-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <Label className="text-xs">Insumo do estoque</Label>
              <Select value={itemId} onValueChange={handleSelectStockItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou digite manual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (não vincular)</SelectItem>
                  {(stockQ.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs">Nome</Label>
              <Input value={iname} onChange={(e) => setIname(e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label className="text-xs">Qtd</Label>
              <DecimalInput
                value={iqty}
                onValueChange={(v) => setIqty(String(v))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Unid.</Label>
              <Select value={iunit} onValueChange={setIunit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stockUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Custo unit. (R$)</Label>
              <DecimalInput
                decimals={4}
                value={icost}
                onValueChange={(v) => setIcost(String(v))}
              />
            </div>
            <div className="sm:col-span-12 flex justify-end">
              <Button
                size="sm"
                onClick={() => addMut.mutate()}
                disabled={addMut.isPending}
              >
                <Plus className="mr-1 h-4 w-4" /> Adicionar ingrediente
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Unid.</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ingredientsQ.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Nenhum ingrediente adicionado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                (ingredientsQ.data ?? []).map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">{ing.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(ing.quantity)}
                    </TableCell>
                    <TableCell>{ing.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(ing.unit_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatBRL(ing.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeMut.mutate(ing.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            Margem atual:{" "}
            <span className="font-medium text-foreground">
              {formatPct(live.margin_pct)}
            </span>{" "}
            · Preço de venda:{" "}
            <span className="font-medium text-foreground">
              {live.sale_price > 0 ? formatBRL(live.sale_price) : "—"}
            </span>
          </span>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KpiBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold tabular-nums ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
