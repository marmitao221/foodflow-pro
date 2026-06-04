import { createFileRoute } from "@tanstack/react-router";
import { MovimentacoesView } from "@/components/estoque/MovimentacoesView";

export const Route = createFileRoute("/_authenticated/estoque/saidas")({
  component: () => <MovimentacoesView type="saida" />,
});
