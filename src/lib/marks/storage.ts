import { mergeComponentBook } from "./component-book";
import type { ComponentBookRow } from "./types";

const STORAGE_KEY = "gasoline-blender-component-book-v1";

export function loadStoredBook(): { book: ComponentBookRow[]; liftEpsilonPerBbl: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { book?: ComponentBookRow[]; liftEpsilonPerBbl?: number };
    return {
      book: mergeComponentBook(parsed.book),
      liftEpsilonPerBbl: Number.isFinite(parsed.liftEpsilonPerBbl) ? Number(parsed.liftEpsilonPerBbl) : 0.25,
    };
  } catch {
    return null;
  }
}

export function persistBook(book: ComponentBookRow[], liftEpsilonPerBbl: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ book: mergeComponentBook(book), liftEpsilonPerBbl }),
    );
  } catch {
    // ignore quota / private mode
  }
}
