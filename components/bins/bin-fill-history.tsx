import type { BinDetail } from "./bin-types";

export function BinFillHistory({
  readings,
}: {
  readings: BinDetail["readings"];
}) {
  if (readings.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        No sensor readings are available.
      </p>
    );
  const values = readings.map((reading) => reading.fillPercentage);
  const points = readings
    .map((reading, index) => {
      const x =
        readings.length === 1 ? 50 : (index / (readings.length - 1)) * 100;
      return `${x},${100 - reading.fillPercentage}`;
    })
    .join(" ");
  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 100"
        className="h-36 w-full overflow-visible"
        role="img"
        aria-label={`Fill history: minimum ${Math.min(...values)}%, maximum ${Math.max(...values)}%, latest ${values.at(-1)}%`}
      >
        <path
          d="M0 100H100M0 50H100M0 0H100"
          stroke="currentColor"
          className="text-border"
          strokeWidth="0.5"
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="text-muted-foreground text-sm">
        Minimum {Math.min(...values)}% · Maximum {Math.max(...values)}% · Latest{" "}
        {values.at(-1)}%
      </p>
    </div>
  );
}
