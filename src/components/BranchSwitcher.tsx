import { Building, ChevronDown, Check } from "lucide-react";

import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BranchSwitcher() {
  const { branches, activeBranchId, setActiveBranchId, loading } = useCompany();
  const active = branches.find((b) => b.id === activeBranchId);
  const label = active ? active.name : "Todas as filiais";

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building className="h-3.5 w-3.5 text-accent" />
          <span className="max-w-[160px] truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filial ativa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setActiveBranchId(null)}>
          <span className="flex-1">Todas as filiais</span>
          {activeBranchId === null && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {branches.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            Nenhuma filial cadastrada.
          </div>
        ) : (
          branches.map((b) => (
            <DropdownMenuItem
              key={b.id}
              disabled={!b.is_active}
              onSelect={() => setActiveBranchId(b.id)}
            >
              <span className="flex-1 truncate">
                {b.name}
                {!b.is_active && <span className="ml-2 text-[10px] uppercase opacity-60">inativa</span>}
              </span>
              {activeBranchId === b.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
