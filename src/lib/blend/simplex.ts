export type ConstraintSense = "<=" | ">=" | "=";

export interface LinearConstraint {
  name: string;
  coeffs: number[];
  sense: ConstraintSense;
  rhs: number;
}

export type LPStatus = "optimal" | "infeasible" | "unbounded";

export interface LPResult {
  status: LPStatus;
  x: number[];
  objective: number;
}

const EPS = 1e-9;
const PIVOT_EPS = 1e-12;

/**
 * Minimize c'x subject to linear constraints and simple bounds.
 * Two-phase revised tableau simplex. Sized for gasoline blend LPs.
 */
export function solveLinearProgram(
  costs: number[],
  constraints: LinearConstraint[],
  lower: number[],
  upper: number[],
): LPResult {
  const n = costs.length;
  if (lower.length !== n || upper.length !== n) {
    throw new Error("Bound vector length must match the number of variables.");
  }

  const shift = lower.map((value) => Math.max(0, value));
  const ranges = upper.map((hi, i) => Math.max(0, hi - shift[i]));

  const rows: { coeffs: number[]; sense: ConstraintSense; rhs: number }[] = [];

  for (const constraint of constraints) {
    let rhs = constraint.rhs;
    const coeffs = constraint.coeffs.map((value, i) => {
      rhs -= value * shift[i];
      return value;
    });
    rows.push({ coeffs, sense: constraint.sense, rhs });
  }

  for (let i = 0; i < n; i += 1) {
    const boundCoeffs = Array.from({ length: n }, (_, j) => (j === i ? 1 : 0));
    rows.push({ coeffs: boundCoeffs, sense: "<=", rhs: ranges[i] });
  }

  const standard = toStandardForm(n, rows);
  const phase1 = runTableau(standard.a, standard.b, standard.phase1c, standard.basis.slice(), "max");
  if (phase1.status !== "optimal" || -phase1.objective > 1e-6) {
    return { status: "infeasible", x: shift, objective: 0 };
  }

  const reduced = dropArtificials(standard, phase1.tableau, phase1.basis);
  if (!reduced) {
    return { status: "infeasible", x: shift, objective: 0 };
  }

  const trueObjective = Array.from({ length: reduced.a[0].length }, (_, j) => {
    if (j < n) return -costs[j];
    return 0;
  });

  const phase2 = runTableau(reduced.a, reduced.b, trueObjective, reduced.basis, "max");
  if (phase2.status === "unbounded") {
    return { status: "unbounded", x: shift, objective: 0 };
  }
  if (phase2.status !== "optimal") {
    return { status: "infeasible", x: shift, objective: 0 };
  }

  const y = Array.from({ length: n }, (_, i) => phase2.x[i] ?? 0);
  const x = y.map((value, i) => shift[i] + value);
  const objective = costs.reduce((acc, cost, i) => acc + cost * x[i], 0);
  return { status: "optimal", x, objective };
}

interface StandardForm {
  a: number[][];
  b: number[];
  phase1c: number[];
  basis: number[];
  nStruct: number;
  nSlack: number;
  nArt: number;
}

function toStandardForm(
  n: number,
  rows: { coeffs: number[]; sense: ConstraintSense; rhs: number }[],
): StandardForm {
  const prepared = rows.map((row) => {
    if (row.rhs < 0) {
      return {
        coeffs: row.coeffs.map((value) => -value),
        sense: flipSense(row.sense),
        rhs: -row.rhs,
      };
    }
    return { ...row, coeffs: row.coeffs.slice() };
  });

  let nSlack = 0;
  let nArt = 0;
  for (const row of prepared) {
    if (row.sense === "<=") nSlack += 1;
    if (row.sense === ">=") {
      nSlack += 1;
      nArt += 1;
    }
    if (row.sense === "=") nArt += 1;
  }

  const width = n + nSlack + nArt;
  const a: number[][] = [];
  const b: number[] = [];
  const basis: number[] = [];
  const phase1c = Array.from({ length: width }, () => 0);

  let slackCol = n;
  let artCol = n + nSlack;

  for (const row of prepared) {
    const coeffs = Array.from({ length: width }, () => 0);
    for (let j = 0; j < n; j += 1) coeffs[j] = row.coeffs[j] ?? 0;

    if (row.sense === "<=") {
      coeffs[slackCol] = 1;
      basis.push(slackCol);
      slackCol += 1;
    } else if (row.sense === ">=") {
      coeffs[slackCol] = -1;
      coeffs[artCol] = 1;
      phase1c[artCol] = -1;
      basis.push(artCol);
      slackCol += 1;
      artCol += 1;
    } else {
      coeffs[artCol] = 1;
      phase1c[artCol] = -1;
      basis.push(artCol);
      artCol += 1;
    }

    a.push(coeffs);
    b.push(row.rhs);
  }

  return { a, b, phase1c, basis, nStruct: n, nSlack, nArt };
}

function flipSense(sense: ConstraintSense): ConstraintSense {
  if (sense === "<=") return ">=";
  if (sense === ">=") return "<=";
  return "=";
}

interface TableauRun {
  status: LPStatus;
  objective: number;
  x: number[];
  basis: number[];
  tableau: { a: number[][]; b: number[]; c: number[] };
}

function runTableau(
  aIn: number[][],
  bIn: number[],
  cIn: number[],
  basis: number[],
  mode: "max",
): TableauRun {
  const m = aIn.length;
  const n = cIn.length;
  const a = aIn.map((row) => row.slice());
  const b = bIn.slice();
  const c = cIn.slice();
  void mode;

  // Price out the initial basis so reduced costs are correct.
  for (let i = 0; i < m; i += 1) {
    const col = basis[i];
    const objCoeff = c[col];
    if (Math.abs(objCoeff) > EPS) {
      for (let j = 0; j < n; j += 1) c[j] -= objCoeff * a[i][j];
    }
  }
  let objective = 0;
  for (let i = 0; i < m; i += 1) {
    const col = basis[i];
    objective += (cIn[col] ?? 0) * b[i];
  }

  const maxIter = 2000;
  for (let iter = 0; iter < maxIter; iter += 1) {
    let enter = -1;
    for (let j = 0; j < n; j += 1) {
      if (c[j] > EPS && (enter === -1 || j < enter)) {
        enter = j;
      }
    }
    if (enter === -1) {
      const x = Array.from({ length: n }, () => 0);
      for (let i = 0; i < m; i += 1) x[basis[i]] = b[i];
      return { status: "optimal", objective, x, basis, tableau: { a, b, c } };
    }

    let leave = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i += 1) {
      if (a[i][enter] > PIVOT_EPS) {
        const ratio = b[i] / a[i][enter];
        if (ratio < bestRatio - EPS || (Math.abs(ratio - bestRatio) <= EPS && (leave === -1 || basis[i] < basis[leave]))) {
          bestRatio = ratio;
          leave = i;
        }
      }
    }
    if (leave === -1) {
      return { status: "unbounded", objective, x: [], basis, tableau: { a, b, c } };
    }

    const pivot = a[leave][enter];
    for (let j = 0; j < n; j += 1) a[leave][j] /= pivot;
    b[leave] /= pivot;

    for (let i = 0; i < m; i += 1) {
      if (i === leave) continue;
      const factor = a[i][enter];
      if (Math.abs(factor) < PIVOT_EPS) continue;
      for (let j = 0; j < n; j += 1) a[i][j] -= factor * a[leave][j];
      b[i] -= factor * b[leave];
    }

    const objFactor = c[enter];
    if (Math.abs(objFactor) > PIVOT_EPS) {
      for (let j = 0; j < n; j += 1) c[j] -= objFactor * a[leave][j];
      objective += objFactor * b[leave];
    }

    basis[leave] = enter;
  }

  return { status: "infeasible", objective, x: [], basis, tableau: { a, b, c } };
}

function dropArtificials(
  standard: StandardForm,
  tableau: { a: number[][]; b: number[] },
  basis: number[],
): { a: number[][]; b: number[]; basis: number[] } | null {
  const keep = standard.nStruct + standard.nSlack;
  const artStart = keep;
  const m = tableau.a.length;

  const newBasis = basis.slice();
  for (let i = 0; i < m; i += 1) {
    if (newBasis[i] < artStart) continue;
    let enter = -1;
    for (let j = 0; j < keep; j += 1) {
      if (Math.abs(tableau.a[i][j]) > PIVOT_EPS) {
        enter = j;
        break;
      }
    }
    if (enter === -1) {
      if (Math.abs(tableau.b[i]) > 1e-7) return null;
      continue;
    }
    const pivot = tableau.a[i][enter];
    for (let j = 0; j < tableau.a[i].length; j += 1) tableau.a[i][j] /= pivot;
    tableau.b[i] /= pivot;
    for (let r = 0; r < m; r += 1) {
      if (r === i) continue;
      const factor = tableau.a[r][enter];
      if (Math.abs(factor) < PIVOT_EPS) continue;
      for (let j = 0; j < tableau.a[r].length; j += 1) {
        tableau.a[r][j] -= factor * tableau.a[i][j];
      }
      tableau.b[r] -= factor * tableau.b[i];
    }
    newBasis[i] = enter;
  }

  const keptRows: number[][] = [];
  const keptB: number[] = [];
  const keptBasis: number[] = [];
  for (let i = 0; i < m; i += 1) {
    if (newBasis[i] >= artStart) continue;
    keptRows.push(tableau.a[i].slice(0, keep));
    keptB.push(tableau.b[i]);
    keptBasis.push(newBasis[i]);
  }

  return { a: keptRows, b: keptB, basis: keptBasis };
}
