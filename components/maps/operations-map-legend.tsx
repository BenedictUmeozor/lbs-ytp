const LEGEND_ITEMS = [
	{ color: "#16a34a", label: "Normal bin", indicator: "marker" },
	{ color: "#eab308", label: "Approaching-full bin", indicator: "marker" },
	{ color: "#dc2626", label: "Collection-required bin", indicator: "marker" },
	{ color: "#7f1d1d", label: "Critical bin", indicator: "marker" },
	{ color: "#9333ea", label: "Citizen report", indicator: "marker" },
	{ color: "#2563eb", label: "Active or on-route truck", indicator: "marker" },
	{ color: "#93c5fd", label: "Available or idle truck", indicator: "marker" },
	{ color: "#4338ca", label: "Depot", indicator: "marker" },
	{ color: "#2563eb", label: "Active route", indicator: "line" },
] as const;

export function OperationsMapLegend() {
	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
			{LEGEND_ITEMS.map(({ color, label, indicator }) => (
				<li key={label} className="flex items-center gap-1.5">
					<span
						aria-hidden="true"
						className={
							indicator === "line"
								? "inline-block h-0 w-4 shrink-0 border-t-2 border-dashed"
								: "inline-block size-2.5 shrink-0 rounded-full"
						}
						style={
							indicator === "line"
								? { borderColor: color }
								: { backgroundColor: color }
						}
					/>
					<span>{label}</span>
				</li>
			))}
		</ul>
	);
}
