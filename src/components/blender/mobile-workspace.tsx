"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type MobileSection = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsContextValue = {
  tabs: ReactNode;
  setTabs: (node: ReactNode) => void;
};

const TabsContext = createContext<TabsContextValue>({
  tabs: null,
  setTabs: () => {},
});

export function MobileTabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<ReactNode>(null);
  const value = useMemo(() => ({ tabs, setTabs }), [tabs]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function MobileTabsSlot() {
  const { tabs } = useContext(TabsContext);
  if (!tabs) return null;
  return <div className="border-t border-border/80 px-3 py-1.5 md:hidden">{tabs}</div>;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return isDesktop;
}

export function MobileWorkspace({
  storageKey,
  defaultSection,
  sections,
  desktop,
  forceTabs = false,
}: {
  storageKey: string;
  defaultSection: string;
  sections: MobileSection[];
  desktop?: ReactNode;
  forceTabs?: boolean;
}) {
  const { setTabs } = useContext(TabsContext);
  const isDesktop = useIsDesktop();
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

  const tabBar = (
    <div
      className="mx-auto grid max-w-6xl gap-1"
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
              on ? "bg-primary text-primary-foreground" : "bg-sky-50 text-muted-foreground",
            )}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );

  useLayoutEffect(() => {
    if (!forceTabs && isDesktop === false) {
      setTabs(tabBar);
      return () => setTabs(null);
    }
    setTabs(null);
    return () => setTabs(null);
  }, [forceTabs, isDesktop, active, sectionIds, setTabs]);

  const desktopTree = (
    <div className="space-y-4">
      {desktop ??
        sections.map((section) => (
          <div key={section.id} className="space-y-4">
            {section.content}
          </div>
        ))}
    </div>
  );

  const mobileTree = (
    <div className="space-y-4">{sections.find((section) => section.id === active)?.content}</div>
  );

  const tabbed = (
    <>
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.15rem)] z-20 -mx-4 mb-3 border-b border-border/80 bg-background/95 px-3 py-1.5 backdrop-blur md:static md:mx-0 md:rounded-xl md:border">
        {tabBar}
      </div>
      {mobileTree}
    </>
  );

  if (forceTabs) return tabbed;
  if (isDesktop === true) return desktopTree;
  if (isDesktop === false) return mobileTree;

  return (
    <>
      <div className="hidden md:block">{desktopTree}</div>
      <div className="md:hidden">{mobileTree}</div>
    </>
  );
}
