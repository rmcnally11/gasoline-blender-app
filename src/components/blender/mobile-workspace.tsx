"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MobileSection = {
  id: string;
  label: string;
  content: ReactNode;
};

export function MobileWorkspace({
  storageKey,
  defaultSection,
  sections,
  desktop,
}: {
  storageKey: string;
  defaultSection: string;
  sections: MobileSection[];
  desktop?: ReactNode;
}) {
  const [active, setActive] = useState(defaultSection);

  const sectionIds = sections.map((section) => section.id).join("|");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`mobile-section:${storageKey}`);
      if (saved && sectionIds.split("|").includes(saved)) {
        setActive(saved);
      }
    } catch {
      /* private mode */
    }
  }, [storageKey, sectionIds]);

  function select(id: string) {
    setActive(id);
    try {
      sessionStorage.setItem(`mobile-section:${storageKey}`, id);
    } catch {
      /* private mode */
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <>
      <div className="hidden space-y-4 md:block">
        {desktop ??
          sections.map((section) => (
            <div key={section.id} className="space-y-4">
              {section.content}
            </div>
          ))}
      </div>

      <div className="md:hidden">
        <div className="sticky top-[calc(env(safe-area-inset-top)+3.15rem)] z-20 -mx-4 mb-3 border-b border-border/80 bg-background/95 px-3 py-1.5 backdrop-blur">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
          >
            {sections.map((section) => {
              const on = section.id === active;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => select(section.id)}
                  className={cn(
                    "min-h-10 rounded-lg px-1 text-xs font-medium",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "bg-sky-50 text-muted-foreground",
                  )}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">{sections.find((section) => section.id === active)?.content}</div>
      </div>
    </>
  );
}
