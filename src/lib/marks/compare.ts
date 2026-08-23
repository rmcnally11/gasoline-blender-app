import type { Plant, PlantSolve } from "@/lib/blend/types";
import { applyMarksAndBook } from "./apply";
import { bookHasLivePrice } from "./component-book";
import { impliedValuesForUsed } from "./implied";
import { plantMoney, type MoneyLine } from "./money";
import type { DailyMarks } from "./types";

export type CompareSide = {
  date: string | null;
  rackPerBbl: number | null;
  ethanolPerBbl: number | null;
  d6Cts: number | null;
  margin: number;
  marginPerBbl: number | null;
};

export type CompareStream = {
  id: string;
  name: string;
  streamKey: string;
  barrels: number;
  today: Pick<MoneyLine, "bookPerBbl" | "impliedPerBbl" | "bookMinusImplied" | "call" | "priceStale">;
  prior: Pick<MoneyLine, "bookPerBbl" | "impliedPerBbl" | "bookMinusImplied" | "call" | "priceStale">;
};

export type SettlementCompare = {
  todayDate: string | null;
  priorDate: string | null;
  priorMissing: boolean;
  bookStale: boolean;
  stripLine: string;
  today: CompareSide;
  prior: CompareSide | null;
  deltaMargin: number | null;
  deltaMarginPerBbl: number | null;
  streams: CompareStream[];
};

function sideFromMoney(
  date: string | null,
  money: ReturnType<typeof plantMoney>,
): CompareSide {
  return {
    date,
    rackPerBbl: money.rackPerBbl,
    ethanolPerBbl: money.ethanolPerBbl,
    d6Cts: money.d6Cts,
    margin: money.margin,
    marginPerBbl: money.marginPerBbl,
  };
}

function lineMap(lines: MoneyLine[]): Map<string, MoneyLine> {
  return new Map(lines.map((line) => [line.id, line]));
}

export function componentBookIsStale(plant: Plant): boolean {
  return !plant.componentBook.some((row) => bookHasLivePrice(row));
}

export function stripLineForCompare(args: {
  bookStale: boolean;
  bookMoved: boolean;
}): string {
  if (args.bookStale) return "component book stale — bid unchanged, book still stale";
  if (args.bookMoved) return "bid moved with the strip";
  return "bid unchanged, book still stale";
}

/**
 * Reprice today's frozen recipe and inventories under the prior Platts Daily row.
 * Does not re-optimize. Empty Component Book leaves alk/FCC stale.
 */
export function compareSettlementDays(args: {
  plant: Plant;
  priorMarks: DailyMarks | null;
  solve: PlantSolve;
  todayImplied?: Record<string, number | null>;
  priorImplied?: Record<string, number | null>;
}): SettlementCompare {
  const { plant, priorMarks, solve } = args;
  const bookStale = componentBookIsStale(plant);
  const todayImplied = args.todayImplied ?? solve.impliedValues;
  const todayMoney = plantMoney(plant, { ...solve, impliedValues: todayImplied });
  const today = sideFromMoney(plant.marks?.date ?? null, todayMoney);

  if (!priorMarks) {
    return {
      todayDate: today.date,
      priorDate: null,
      priorMissing: true,
      bookStale,
      stripLine: bookStale
        ? "component book stale — bid unchanged, book still stale"
        : "No prior Platts Daily settlement row.",
      today,
      prior: null,
      deltaMargin: null,
      deltaMarginPerBbl: null,
      streams: todayMoney.lines.map((line) => ({
        id: line.id,
        name: line.name,
        streamKey: line.streamKey,
        barrels: line.barrels,
        today: {
          bookPerBbl: line.bookPerBbl,
          impliedPerBbl: line.impliedPerBbl,
          bookMinusImplied: line.bookMinusImplied,
          call: line.call,
          priceStale: line.priceStale,
        },
        prior: {
          bookPerBbl: line.bookPerBbl,
          impliedPerBbl: null,
          bookMinusImplied: null,
          call: line.call,
          priceStale: line.priceStale,
        },
      })),
    };
  }

  const priorPlant = applyMarksAndBook({ ...plant, marks: priorMarks });
  const priorImplied = args.priorImplied ?? impliedValuesForUsed(priorPlant, solve.componentUsedBbl);
  const priorMoney = plantMoney(priorPlant, { ...solve, impliedValues: priorImplied });
  const prior = sideFromMoney(priorMarks.date, priorMoney);
  const todayLines = lineMap(todayMoney.lines);
  const priorLines = lineMap(priorMoney.lines);
  const ids = [...new Set([...todayLines.keys(), ...priorLines.keys()])];

  const streams: CompareStream[] = ids.map((id) => {
    const todayLine = todayLines.get(id);
    const priorLine = priorLines.get(id);
    const line = todayLine ?? priorLine!;
    return {
      id,
      name: line.name,
      streamKey: line.streamKey,
      barrels: todayLine?.barrels ?? priorLine?.barrels ?? 0,
      today: {
        bookPerBbl: todayLine?.bookPerBbl ?? line.bookPerBbl,
        impliedPerBbl: todayLine?.impliedPerBbl ?? null,
        bookMinusImplied: todayLine?.bookMinusImplied ?? null,
        call: todayLine?.call ?? line.call,
        priceStale: todayLine?.priceStale,
      },
      prior: {
        bookPerBbl: priorLine?.bookPerBbl ?? line.bookPerBbl,
        impliedPerBbl: priorLine?.impliedPerBbl ?? null,
        bookMinusImplied: priorLine?.bookMinusImplied ?? null,
        call: priorLine?.call ?? line.call,
        priceStale: priorLine?.priceStale,
      },
    };
  });

  const bookMoved = streams.some((stream) => {
    if (stream.today.priceStale && stream.prior.priceStale) return false;
    return Math.abs(stream.today.bookPerBbl - stream.prior.bookPerBbl) > 1e-6;
  });

  return {
    todayDate: today.date,
    priorDate: prior.date,
    priorMissing: false,
    bookStale,
    stripLine: stripLineForCompare({ bookStale, bookMoved }),
    today,
    prior,
    deltaMargin: today.margin - prior.margin,
    deltaMarginPerBbl:
      today.marginPerBbl === null || prior.marginPerBbl === null
        ? null
        : today.marginPerBbl - prior.marginPerBbl,
    streams,
  };
}
