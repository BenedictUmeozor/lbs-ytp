export const BARIGA_PILOT_BOUNDS = {
  minimumLatitude: 6.5,
  maximumLatitude: 6.57,
  minimumLongitude: 3.35,
  maximumLongitude: 3.43,
};

const VAGUE_LANDMARKS = new Set([
  "bariga",
  "lagos",
  "around my area",
  "my area",
  "near the road",
  "the road",
  "around here",
  "here",
  "this place",
  "nearby",
  "bus stop",
  "near bus stop",
  "the bus stop",
  "main road",
  "near the market",
  "the market",
]);

const GENERIC_ONE_WORD_LOCATIONS = new Set([
  "area",
  "road",
  "street",
  "junction",
  "market",
  "busstop",
  "compound",
  "house",
  "school",
  "church",
  "mosque",
]);

export function isCoordinateInsideBarigaPilot(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= BARIGA_PILOT_BOUNDS.minimumLatitude &&
    latitude <= BARIGA_PILOT_BOUNDS.maximumLatitude &&
    longitude >= BARIGA_PILOT_BOUNDS.minimumLongitude &&
    longitude <= BARIGA_PILOT_BOUNDS.maximumLongitude
  );
}

export function normalizeLandmarkQuery(landmark: string): string {
  return landmark
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .toLowerCase();
}

export function isObviouslyVagueLandmark(landmark: string): boolean {
  const normalized = normalizeLandmarkQuery(landmark);
  if (
    normalized === "[redacted contact]" ||
    !/[\p{L}\p{N}]/u.test(normalized) ||
    VAGUE_LANDMARKS.has(normalized)
  ) {
    return true;
  }

  const words = normalized.split(" ").filter(Boolean);
  return words.length === 1 && GENERIC_ONE_WORD_LOCATIONS.has(words[0]);
}

export function redactContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[redacted contact]")
    .replace(
      /(?:\+?234|0)[\s().-]*[7-9](?:[\s().-]*\d){9}\b/g,
      "[redacted contact]",
    )
    .replace(/\b(?:\d[\s().-]*){8,}\d\b/g, "[redacted contact]");
}

export function parseNominatimCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum
    ? coordinate
    : null;
}

export function getAcceptableNominatimResult(value: unknown): {
  latitude: number;
  longitude: number;
  displayName: string;
} | null {
  if (typeof value !== "object" || value === null) return null;
  const result = value as Record<string, unknown>;
  const latitude = parseNominatimCoordinate(result.lat, -90, 90);
  const longitude = parseNominatimCoordinate(result.lon, -180, 180);
  if (
    latitude === null ||
    longitude === null ||
    !isCoordinateInsideBarigaPilot(latitude, longitude)
  ) {
    return null;
  }

  const displayName =
    typeof result.display_name === "string"
      ? result.display_name.trim().slice(0, 300)
      : "";
  return { latitude, longitude, displayName };
}
