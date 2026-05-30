import { ChefHat } from "lucide-react";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm">
        <ChefHat className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight">CozinhaPro</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Gestão de Restaurantes
          </span>
        </div>
      )}
    </div>
  );
}
