import { REPORT_CATEGORIES, type ReportCategory } from "./report-types";

export function reportCategoryLabel(category?: ReportCategory): string {
  return (
    REPORT_CATEGORIES.find((item) => item.value === category)?.label ??
    "Waste issue"
  );
}
