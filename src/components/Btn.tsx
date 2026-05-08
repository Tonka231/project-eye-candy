import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  iconOnly?: boolean;
  icon?: ReactNode;
}

export function Btn({ variant = "secondary", iconOnly, icon, className, children, ...rest }: Props) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = iconOnly ? "h-8 w-8" : "h-8 px-3";
  const variants: Record<Variant, string> = {
    primary: "bg-accent text-text-inverse hover:bg-accent-glow",
    secondary: "bg-bg-elevated text-text-primary border border-border-default hover:border-border-emphasis",
    ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
    danger: "bg-status-danger/15 text-status-danger border border-status-danger/30 hover:bg-status-danger/25",
  };
  return (
    <button {...rest} className={cn(base, sizes, variants[variant], className)}>
      {icon}
      {!iconOnly && children}
    </button>
  );
}
