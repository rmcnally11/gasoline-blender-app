"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";

export function TermTip({
  term,
  children,
  className,
}: {
  term: GlossaryKey;
  children: React.ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[term];
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "inline cursor-help border-0 bg-transparent p-0 text-left text-inherit font-[inherit] underline decoration-dotted decoration-sky-700/55 underline-offset-2",
          className,
        )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-72 flex-col items-start gap-1 py-2 text-left leading-5"
      >
        <p className="font-medium">{entry.term}</p>
        <p>{entry.short}</p>
      </TooltipContent>
    </Tooltip>
  );
}
