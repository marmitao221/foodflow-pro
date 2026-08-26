import { ChefHat } from "lucide-react";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground">
        <ChefHat className="h-4 w-4" strokeWidth={1.5} />
      </div>
      {!collapsed && (
        <div className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-lg tracking-tight">CozinhaPro</span>
          <span className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Gestão de cozinhas
          </span>
        </div>
      )}
    </div>
  );
}
