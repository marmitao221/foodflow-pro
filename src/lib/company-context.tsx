import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export type Branch = {
  id: string;
  company_id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  manager_name: string | null;
  is_active: boolean;
};

export type CompanySummary = { id: string; name: string; logo_url: string | null };

type Ctx = {
  company: CompanySummary | null;
  branches: Branch[];
  activeBranchId: string | null; // null = "Todas as filiais"
  setActiveBranchId: (id: string | null) => void;
  loading: boolean;
};

const CompanyContext = createContext<Ctx | undefined>(undefined);
const LS_KEY = "cozinhapro:active-branch";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["company-context", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: m } = await supabase
        .from("memberships")
        .select("company_id, companies(id, name, logo_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const company = (m?.companies as CompanySummary | null) ?? null;
      if (!company) return { company: null, branches: [] as Branch[] };
      const { data: branches } = await supabase
        .from("branches")
        .select("id, company_id, name, city, state, address, manager_name, is_active")
        .eq("company_id", company.id)
        .order("created_at", { ascending: true });
      return { company, branches: (branches ?? []) as Branch[] };
    },
  });

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (stored) setActiveBranchIdState(stored === "__all__" ? null : stored);
  }, []);

  const setActiveBranchId = (id: string | null) => {
    setActiveBranchIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id ?? "__all__");
  };

  return (
    <CompanyContext.Provider
      value={{
        company: data?.company ?? null,
        branches: data?.branches ?? [],
        activeBranchId,
        setActiveBranchId,
        loading: isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}
