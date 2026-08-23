import type { PriceOrigin } from "@/lib/blend/types";

export type LiftCall = "LIFT" | "DON'T LIFT";

export function liftDecision(args: {
  bookPerBbl: number;
  impliedPerBbl: number | null;
  epsilonPerBbl: number;
  priceOrigin?: PriceOrigin;
}): { call: LiftCall; reason: string; bookMinusImplied: number | null } {
  const epsilon = Number.isFinite(args.epsilonPerBbl) ? args.epsilonPerBbl : 0.25;
  const bookMinusImplied = args.impliedPerBbl === null ? null : args.bookPerBbl - args.impliedPerBbl;

  if (args.priceOrigin === "defaults" || args.priceOrigin === undefined) {
    return {
      call: "DON'T LIFT",
      reason: "Toy default assay — book is not Platts, basis, override, or a price you typed.",
      bookMinusImplied,
    };
  }
  if (args.impliedPerBbl === null) {
    return {
      call: "DON'T LIFT",
      reason: "No LP implied value yet.",
      bookMinusImplied: null,
    };
  }
  if (bookMinusImplied !== null && bookMinusImplied > epsilon) {
    return {
      call: "DON'T LIFT",
      reason: `Implied is $${bookMinusImplied.toFixed(2)}/bbl below book (epsilon $${epsilon.toFixed(2)}/bbl).`,
      bookMinusImplied,
    };
  }
  return {
    call: "LIFT",
    reason: "Implied covers book within epsilon.",
    bookMinusImplied,
  };
}
