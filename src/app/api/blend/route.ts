import {
  blendComponents,
  evaluateBlend,
  findGrade,
  DEFAULT_COMPONENTS,
  GRADE_SPECS,
  SEASON_MAX_RVP,
  type Component,
  type Season,
} from "@/lib/blend";

export const dynamic = "force-dynamic";

interface BlendRequestBody {
  volumes?: Record<string, number>;
  gradeId?: string;
  season?: Season;
  components?: Component[];
}

/** Returns the default blendstock library and available specs. */
export function GET() {
  return Response.json({
    components: DEFAULT_COMPONENTS,
    grades: GRADE_SPECS,
    seasons: SEASON_MAX_RVP,
  });
}

/** Computes a blend and evaluates it against the requested grade/season spec. */
export async function POST(request: Request) {
  let body: BlendRequestBody;
  try {
    body = (await request.json()) as BlendRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const components = body.components ?? DEFAULT_COMPONENTS;
  const volumes = body.volumes ?? {};
  const season: Season = body.season === "winter" ? "winter" : "summer";
  const grade = findGrade(body.gradeId ?? "regular");

  if (!grade) {
    return Response.json(
      { error: `Unknown grade "${body.gradeId}".` },
      { status: 400 }
    );
  }

  const result = blendComponents(components, volumes);
  const evaluation = evaluateBlend(result, grade, season);

  return Response.json({ grade, season, result, evaluation });
}
