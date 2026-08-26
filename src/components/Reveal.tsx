import type { ElementType, ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** atraso da animação em ms — usado para cascata em grades */
  delay?: number;
  as?: ElementType;
};

/**
 * Envolve um bloco e o revela suavemente sempre que ele entra na tela.
 */
export function Reveal({ children, className, delay = 0, as }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-visible="false"
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
