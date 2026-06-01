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

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; disabled?: boolean };

const operacao: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Estoque", url: "/estoque", icon: Package, disabled: true },
  { title: "Produção", url: "/producao", icon: ChefHat, disabled: true },
  { title: "Fichas Técnicas", url: "/fichas", icon: ClipboardList, disabled: true },
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

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.url.startsWith("/financeiro")
              ? currentPath.startsWith("/financeiro")
              : currentPath === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  {item.disabled ? (
                    <span className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                      <item.icon className="h-4 w-4" />
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
                      <item.icon className="h-4 w-4" />
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
