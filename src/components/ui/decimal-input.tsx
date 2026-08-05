import * as React from "react";
import { Input } from "@/components/ui/input";

/** Converte texto digitado (pt-BR ou en-US) em número. Aceita "0,5", "1.250,75", "2.75". */
export function parseDecimal(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (raw == null) return 0;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes(",")) {
    // vírgula é o separador decimal → ponto é separador de milhar
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Formata número no padrão brasileiro para exibição no input. */
export function formatDecimal(n: number, decimals = 3): string {
  return Number(n || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: decimals,
    useGrouping: false,
  });
}

type DecimalInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: number | string | null | undefined;
  onValueChange: (value: number) => void;
  /** casas decimais exibidas (padrão 3) */
  decimals?: number;
};

/**
 * Campo numérico decimal com suporte a vírgula e ponto.
 * O valor emitido em `onValueChange` já vem convertido para número.
 */
export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onValueChange, decimals = 3, onFocus, onBlur, ...rest }, ref) => {
    const numeric = parseDecimal(value ?? 0);
    const [text, setText] = React.useState(() => formatDecimal(numeric, decimals));
    const [editing, setEditing] = React.useState(false);

    React.useEffect(() => {
      if (!editing) setText(formatDecimal(numeric, decimals));
    }, [numeric, editing, decimals]);

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={(e) => {
          setEditing(true);
          onFocus?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setText(raw);
          onValueChange(parseDecimal(raw));
        }}
        onBlur={(e) => {
          setEditing(false);
          const n = parseDecimal(text);
          setText(formatDecimal(n, decimals));
          onValueChange(n);
          onBlur?.(e);
        }}
      />
    );
  },
);
DecimalInput.displayName = "DecimalInput";
