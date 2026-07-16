import type { Priority, ReportCategory } from "./validators";

export type GeminiTriageResult = {
  category: ReportCategory;
  priority: Priority;
  locationText: string;
  summary: string;
  requiresCollection: boolean;
  needsClarification: boolean;
};

const categories = new Set<ReportCategory>([
  "overflowing_waste",
  "illegal_dumpsite",
  "missed_collection",
  "drainage_blockage",
  "other",
]);
const priorities = new Set<Priority>(["low", "medium", "high", "critical"]);

export function isValidGeminiTriageResult(
  value: unknown,
): value is GeminiTriageResult {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const result = value as Record<string, unknown>;
  const requiredFields = [
    "category",
    "priority",
    "locationText",
    "summary",
    "requiresCollection",
    "needsClarification",
  ];
  return (
    Object.keys(result).length === requiredFields.length &&
    requiredFields.every((field) => field in result) &&
    typeof result.category === "string" &&
    categories.has(result.category as ReportCategory) &&
    typeof result.priority === "string" &&
    priorities.has(result.priority as Priority) &&
    typeof result.locationText === "string" &&
    result.locationText.trim().length <= 200 &&
    typeof result.summary === "string" &&
    result.summary.trim().length >= 10 &&
    result.summary.trim().length <= 240 &&
    typeof result.requiresCollection === "boolean" &&
    typeof result.needsClarification === "boolean"
  );
}

export function trimGeminiTriageResult(
  result: GeminiTriageResult,
): GeminiTriageResult {
  return {
    ...result,
    locationText: result.locationText.trim(),
    summary: result.summary.trim(),
  };
}

export function classifyReportWithRules(input: {
  description: string;
  residentCategory: ReportCategory;
  locationResolved: boolean;
  landmark?: string;
}): GeminiTriageResult {
  const text = input.description.toLowerCase();
  const has = (terms: string[]) => terms.some((term) => text.includes(term));
  const category: ReportCategory = has([
    "blocked drainage",
    "blocked drain",
    "drainage",
    "gutter",
    "flood",
    "flooding",
    "water cannot pass",
  ])
    ? "drainage_blockage"
    : has([
          "illegal dump",
          "illegal dumping",
          "dumpsite",
          "dump site",
          "refuse heap",
          "waste heap",
          "people are dumping",
        ])
      ? "illegal_dumpsite"
      : has([
            "missed collection",
            "not collected",
            "has not been collected",
            "truck did not come",
            "waste collectors did not come",
            "days without collection",
            "weeks without collection",
          ])
        ? "missed_collection"
        : has([
              "overflowing",
              "overflow",
              "full bin",
              "bin is full",
              "spilling",
              "packed",
              "waste coming out",
            ])
          ? "overflowing_waste"
          : input.residentCategory;
  const critical = has([
    "fire",
    "burning waste",
    "explosion",
    "toxic chemical",
    "dangerous chemical",
    "severe flooding",
    "people trapped",
    "major road completely blocked",
    "immediate danger",
  ]);
  const high = has([
    "road obstruction",
    "blocking traffic",
    "health hazard",
    "serious smell",
    "disease risk",
    "mosquito infestation",
    "school entrance blocked",
    "hospital entrance blocked",
    "market access blocked",
  ]);
  const recognisableIssue =
    category !== "other" ||
    has(["waste", "bin", "refuse", "dump", "collection", "drain"]);
  const summary = input.description.trim().replace(/\s+/g, " ").slice(0, 240);

  return {
    category,
    priority: critical
      ? "critical"
      : high
        ? "high"
        : category === "other" && !has(["collection", "waste", "bin", "refuse"])
          ? "low"
          : "medium",
    locationText: input.landmark?.trim().slice(0, 200) ?? "",
    summary:
      summary.length >= 10
        ? summary
        : "Resident submitted a waste management report.",
    requiresCollection:
      category === "overflowing_waste" ||
      category === "missed_collection" ||
      (category === "drainage_blockage" &&
        has(["waste", "refuse", "rubbish"])) ||
      (category === "other" && has(["collect", "collection"])),
    needsClarification:
      !input.locationResolved || !recognisableIssue || summary.length < 10,
  };
}
