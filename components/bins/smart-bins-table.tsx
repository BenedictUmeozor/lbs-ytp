import { DataSourceLabel } from "@/components/dashboard/data-source-label";
import { StatusBadge } from "@/components/dashboard/status-badge";

import type { BinFilter, BinList } from "./bin-types";

function formatTime(timestamp: number | undefined) {
  return timestamp === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp);
}

export function SmartBinsTable({
  bins,
  filter,
  selectedId,
  onSelect,
}: {
  bins: BinList;
  filter: BinFilter;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const filtered = bins.filter(
    (bin) =>
      filter === "all" ||
      (filter === "offline"
        ? bin.deviceStatus === "offline"
        : filter === "real" || filter === "simulated"
          ? bin.source === filter
          : bin.status === filter),
  );
  if (filtered.length === 0)
    return (
      <p className="text-muted-foreground p-6 text-sm">
        No smart bins match this filter.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="hidden w-full min-w-[1050px] text-left text-sm md:table">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            {[
              "Bin ID",
              "Name",
              "Address",
              "Fill",
              "Bin status",
              "Device",
              "Last reading",
              "Active task",
              "Last collection",
              "Source",
            ].map((title) => (
              <th key={title} className="p-3 font-medium">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((bin) => (
            <tr
              key={bin.id}
              className={
                selectedId === bin.id ? "bg-muted" : "hover:bg-muted/60"
              }
            >
              <td className="p-3">
                <button
                  type="button"
                  className="font-medium underline-offset-4 hover:underline"
                  onClick={() => onSelect(bin.id)}
                >
                  {bin.displayId}
                </button>
              </td>
              <td className="p-3">{bin.name}</td>
              <td className="p-3">{bin.address}</td>
              <td className="p-3">{bin.currentFillPercentage}%</td>
              <td className="p-3">
                <StatusBadge status={bin.status} />
              </td>
              <td className="p-3">
                {bin.deviceStatus ? (
                  <StatusBadge status={bin.deviceStatus} />
                ) : (
                  "—"
                )}
              </td>
              <td className="p-3">{formatTime(bin.lastReadingAt)}</td>
              <td className="p-3">{bin.activeTask?.displayId ?? "—"}</td>
              <td className="p-3">{formatTime(bin.lastCollectionAt)}</td>
              <td className="p-3">
                <DataSourceLabel source={bin.source} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-3 p-3 md:hidden">
        {filtered.map((bin) => (
          <button
            key={bin.id}
            type="button"
            onClick={() => onSelect(bin.id)}
            className="w-full rounded-lg border p-4 text-left"
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium">
                {bin.displayId} · {bin.name}
              </span>
              <span>{bin.currentFillPercentage}%</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{bin.address}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={bin.status} />
              {bin.deviceStatus && <StatusBadge status={bin.deviceStatus} />}
              <DataSourceLabel source={bin.source} />
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Last reading: {formatTime(bin.lastReadingAt)} · Task:{" "}
              {bin.activeTask?.displayId ?? "None"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
