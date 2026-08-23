import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
  busy?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  busy,
  type = "button",
  className,
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/85",
        variant === "outline" && "border border-border bg-background hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
