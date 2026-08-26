import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { acceptInvite, getInviteInfo } from "@/lib/convites.functions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/convite/$token")({
  component: ConvitePage,
  head: () => ({
    meta: [
      { title: "Convite para a equipe | CozinhaPro" },
      {
        name: "description",
        content:
          "Aceite o convite e crie seu acesso à equipe no CozinhaPro com nome, e-mail e senha.",
      },
      { property: "og:title", content: "Convite para a equipe | CozinhaPro" },
      {
        property: "og:description",
        content: "Crie seu acesso de funcionário no CozinhaPro em poucos segundos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ConvitePage() {
  const { token } = useParams({ from: "/convite/$token" });
  const navigate = useNavigate();
  const info = useServerFn(getInviteInfo);
  const accept = useServerFn(acceptInvite);

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });

  const inviteQuery = useQuery({
    queryKey: ["invite-info", token],
    queryFn: () => info({ data: { token } }),
    retry: false,
  });

  useEffect(() => {
    if (inviteQuery.data?.valid) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || (inviteQuery.data.suggestedName ?? ""),
        email: f.email || (inviteQuery.data.suggestedEmail ?? ""),
      }));
    }
  }, [inviteQuery.data]);

  const submit = useMutation({
    mutationFn: async () => {
      if (form.fullName.trim().length < 2) throw new Error("Informe seu nome completo");
      if (form.password.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres");
      if (form.password !== form.confirm) throw new Error("As senhas não conferem");
      await accept({
        data: {
          token,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (error) throw new Error("Conta criada! Faça login para continuar.");
    },
    onSuccess: () => {
      toast.success("Bem-vindo à equipe!");
      navigate({ to: "/equipe/rotina" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-3 text-center">
          <Logo />
          {inviteQuery.isLoading ? (
            <CardTitle className="text-base font-normal text-muted-foreground">
              Carregando convite...
            </CardTitle>
          ) : inviteQuery.data?.valid ? (
            <div>
              <CardTitle className="text-lg">Convite para {inviteQuery.data.companyName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie seu acesso com nome, e-mail e senha. Seu perfil será de funcionário, com as
                áreas liberadas pelo administrador.
              </p>
            </div>
          ) : (
            <CardTitle className="text-lg">Convite indisponível</CardTitle>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {inviteQuery.isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!inviteQuery.isLoading && !inviteQuery.data?.valid && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {inviteQuery.data && "reason" in inviteQuery.data
                  ? inviteQuery.data.reason
                  : "Não foi possível validar este convite."}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Ir para o login</Link>
              </Button>
            </div>
          )}

          {inviteQuery.data?.valid && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="voce@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirma">Confirmar senha</Label>
                <Input
                  id="confirma"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submit.isPending}>
                {submit.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Entrar na equipe
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
