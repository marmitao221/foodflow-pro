import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ClipboardList,
  FileText,
  Trash2,
  BarChart3,
  Settings,
  Building,
  LogOut,
  Wallet,
  UtensilsCrossed,
  Users,
  ClipboardCheck,
} from "lucide-react";


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { requiredFor, useMembership } from "@/lib/permissions";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  /** Oculto para administradores (segue disponível dentro de Equipe). */
  hideForAdmin?: boolean;
};

const operacao: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Restaurante", url: "/restaurante/comandas", icon: UtensilsCrossed },
  { title: "Estoque", url: "/estoque/dashboard", icon: Package },
  { title: "Produção", url: "/producao", icon: ChefHat, disabled: true },
  { title: "Fichas Técnicas", url: "/fichas", icon: ClipboardList },
  { title: "Minha Rotina", url: "/equipe/rotina", icon: ClipboardCheck, hideForAdmin: true },
  { title: "Equipe", url: "/equipe/dashboard", icon: ClipboardCheck },
  { title: "RH", url: "/rh/dashboard", icon: Users },
];


const negocio: NavItem[] = [
  { title: "Financeiro", url: "/financeiro/fluxo", icon: Wallet },
  { title: "Contratos", url: "/contratos", icon: FileText, disabled: true },
  { title: "Desperdício", url: "/desperdicio", icon: Trash2, disabled: true },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, disabled: true },
];

const sistema: NavItem[] = [
  { title: "Empresa", url: "/configuracoes/empresa", icon: Settings },
  { title: "Filiais", url: "/configuracoes/filiais", icon: Building },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const { isAdmin, can, loading: loadingPerms } = useMembership();

  const allowed = (item: NavItem) => {
    if (item.hideForAdmin && isAdmin) return false;
    const required = requiredFor(item.url);
    if (!required) return true;
    if (isAdmin) return true;
    if (required.adminOnly) return false;
    return !!required.perm && can(required.perm);
  };

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = loadingPerms ? [] : items.filter(allowed);
    if (visible.length === 0) return null;
    return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => {
            const prefix = item.url.split("/").slice(0, 2).join("/");
            const active =
              prefix === "/equipe"
                ? currentPath.startsWith(item.url)
                : prefix === "/financeiro" || prefix === "/restaurante" || prefix === "/estoque" || prefix === "/rh" || prefix === "/configuracoes"
                  ? currentPath.startsWith(prefix)
                  : currentPath === item.url;


            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                  className="relative font-normal data-[active=true]:font-medium data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-4 data-[active=true]:before:w-[2px] data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-primary"
                >
                  {item.disabled ? (
                    <span className="flex items-center gap-2 opacity-45 cursor-not-allowed">
                      <item.icon className="h-4 w-4" strokeWidth={1.5} />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          {item.title}
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            em breve
                          </span>
                        </span>
                      )}
                    </span>
                  ) : (
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" strokeWidth={1.5} />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );

          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
    );
  };


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Logo collapsed={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operação", operacao)}
        {renderGroup("Negócio", negocio)}
        {renderGroup("Sistema", sistema)}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium truncate">{user.email}</p>
            <p className="text-[10px] text-muted-foreground">Admin da empresa</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
