const LEGEND_ITEMS = [
  { color: "#16a34a", label: "Normal bin" },
  { color: "#eab308", label: "Approaching-full bin" },
  { color: "#dc2626", label: "Collection-required bin" },
  { color: "#7f1d1d", label: "Critical bin" },
  { color: "#9333ea", label: "Citizen report" },
  { color: "#2563eb", label: "Active or on-route truck" },
  { color: "#93c5fd", label: "Available or idle truck" },
  { color: "#4338ca", label: "Depot" },
] as const;

export function OperationsMapLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {LEGEND_ITEMS.map(({ color, label }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
