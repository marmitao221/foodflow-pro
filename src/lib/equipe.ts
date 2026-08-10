export const SECTORS = [
  { value: "cozinha", label: "Cozinha" },
  { value: "estoque", label: "Estoque" },
  { value: "salao", label: "Salão/Refeitório" },
  { value: "limpeza", label: "Limpeza" },
  { value: "administrativo", label: "Administrativo" },
  { value: "entrega", label: "Entrega" },
  { value: "outros", label: "Outros" },
] as const;

export type Sector = (typeof SECTORS)[number]["value"];

export const FREQUENCIES = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "personalizada", label: "Personalizada" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];

export const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
] as const;

export type Priority = (typeof PRIORITIES)[number]["value"];

export const TASK_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "nao_realizada", label: "Não realizada" },
] as const;

export type TaskStatus = (typeof TASK_STATUS)[number]["value"];

export const APPROVALS = [
  { value: "nao_requer", label: "Não requer" },
  { value: "aguardando", label: "Aguardando gerente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "correcao", label: "Correção solicitada" },
] as const;

export type Approval = (typeof APPROVALS)[number]["value"];

export const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
] as const;

export const sectorLabel = (v: string) => SECTORS.find((s) => s.value === v)?.label ?? v;
export const frequencyLabel = (v: string) => FREQUENCIES.find((s) => s.value === v)?.label ?? v;
export const priorityLabel = (v: string) => PRIORITIES.find((s) => s.value === v)?.label ?? v;
export const statusLabel = (v: string) => TASK_STATUS.find((s) => s.value === v)?.label ?? v;
export const approvalLabel = (v: string) => APPROVALS.find((s) => s.value === v)?.label ?? v;

export const PRIORITY_CLASS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  alta: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgente: "bg-destructive/15 text-destructive",
};

export const STATUS_CLASS: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  nao_realizada: "bg-destructive/15 text-destructive",
};

export const APPROVAL_CLASS: Record<string, string> = {
  nao_requer: "bg-muted text-muted-foreground",
  aguardando: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  aprovado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  reprovado: "bg-destructive/15 text-destructive",
  correcao: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

export const today = () => new Date().toISOString().slice(0, 10);

export const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : "—");

export const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function isLate(status: string, dueDate: string, dueTime: string | null) {
  if (status === "concluida") return false;
  const now = new Date();
  const limit = new Date(`${dueDate}T${dueTime ?? "23:59"}:00`);
  return now > limit;
}

/** Checklists sugeridos por setor (modelos prontos) */
export const SECTOR_PRESETS: { sector: Sector; name: string; items: string[] }[] = [
  {
    sector: "cozinha",
    name: "Abertura da Cozinha",
    items: [
      "Ligar equipamentos",
      "Conferir gás",
      "Conferir estoque da cozinha",
      "Higienizar bancadas",
      "Conferir temperaturas",
      "Conferir cardápio",
    ],
  },
  {
    sector: "cozinha",
    name: "Fechamento da Cozinha",
    items: [
      "Desligar equipamentos",
      "Armazenar alimentos",
      "Identificar sobras",
      "Registrar desperdício",
      "Higienizar equipamentos",
      "Higienizar bancadas",
      "Retirar lixo",
    ],
  },
  {
    sector: "cozinha",
    name: "Produção Diária",
    items: [
      "Separar ingredientes",
      "Iniciar pré-preparo",
      "Preparar proteínas",
      "Preparar guarnições",
      "Conferir produção",
      "Registrar quantidade produzida",
    ],
  },
  {
    sector: "estoque",
    name: "Rotina do Estoque",
    items: [
      "Conferência de estoque",
      "Organização das prateleiras",
      "Conferir validades",
      "Aplicar FIFO/PEPS",
      "Limpeza do estoque",
      "Recebimento de mercadorias",
    ],
  },
  {
    sector: "salao",
    name: "Rotina do Salão/Refeitório",
    items: [
      "Organização das mesas",
      "Limpeza do salão",
      "Reposição de itens",
      "Organização dos utensílios",
      "Conferência do buffet",
    ],
  },
  {
    sector: "limpeza",
    name: "Cronograma de Limpeza",
    items: ["Pisos", "Bancadas", "Equipamentos", "Banheiros", "Lixeiras", "Áreas externas"],
  },
];
