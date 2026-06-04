import { createFileRoute } from "@tanstack/react-router";
import { MovimentacoesView } from "@/components/estoque/MovimentacoesView";

export const Route = createFileRoute("/_authenticated/estoque/entradas")({
  component: () => <MovimentacoesView type="entrada" />,
});
