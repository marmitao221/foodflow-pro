import { useState } from "react";
import { Printer, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LS_KEY = "cozinhapro:direct-print-configured";

export const KIOSK_ARG =
  '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=https://cozinhaproo.lovable.app';

export function isDirectPrintConfigured() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(LS_KEY) === "1";
}

export function markDirectPrintConfigured() {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, "1");
}

export function DirectPrintHelpDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(KIOSK_ARG);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Printer className="h-4 w-4 mr-1" /> Impressão direta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Imprimir sem o diálogo do navegador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            O sistema já envia a comanda direto para a impressora. A janela “Imprimir” que aparece é
            do Chrome e só pode ser desativada no próprio computador do caixa — faça isso uma vez:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              No Windows, abra <strong>Impressoras e scanners</strong> e defina a impressora térmica
              como <strong>padrão</strong>.
            </li>
            <li>
              Crie um atalho na área de trabalho e, em <strong>Destino</strong>, cole o comando
              abaixo (ajuste o caminho do Chrome se estiver em outra pasta):
              <div className="mt-2 flex items-start gap-2">
                <code className="flex-1 break-all rounded-md bg-muted px-2 py-1.5 text-xs">
                  {KIOSK_ARG}
                </code>
                <Button variant="outline" size="icon" onClick={copy} aria-label="Copiar comando">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </li>
            <li>
              Use o sistema sempre por esse atalho. A partir daí a comanda sai na hora, sem nenhuma
              janela.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Dica: nas preferências da impressora, deixe a densidade em “Alta” e a velocidade em
            “Baixa” para a impressão sair bem escura.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              markDirectPrintConfigured();
              setOpen(false);
              toast.success("Ok! Não vou mais mostrar esse aviso.");
            }}
          >
            Já configurei
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
