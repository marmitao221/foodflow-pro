import { createFileRoute, Outlet, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2, Menu } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { CompanyProvider } from "@/lib/company-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: memberships, isLoading: loadingMembership } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, company_id, role, companies(id, name)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!loading && !loadingMembership && user && memberships && memberships.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [loading, loadingMembership, user, memberships, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;

  return (
    <CompanyProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger>
                  <Menu className="h-4 w-4" />
                </SidebarTrigger>
                <span className="text-sm font-medium text-muted-foreground">
                  {memberships?.[0]?.companies?.name ?? "CozinhaPro"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BranchSwitcher />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1">
              <PermissionGate path={pathname}>
                <Outlet />
              </PermissionGate>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </CompanyProvider>
  );
}
