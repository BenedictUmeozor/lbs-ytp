import Link from "next/link";
import type { ReactNode } from "react";

import { DataSourceLabel } from "@/components/dashboard/data-source-label";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import {
  StatusBadge,
  humanizeStatus,
} from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import type { OperationsMapData, SelectedEntity } from "./operations-map-types";

const formatter = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
  timeStyle: "short",
});
const date = (value: number | undefined) =>
  value === undefined ? "Not available" : formatter.format(new Date(value));
const value = (item: string | undefined) => item ?? "Not available";

type PanelProps = {
  data: OperationsMapData;
  visible: {
    bins: OperationsMapData["bins"];
    reports: OperationsMapData["reports"];
    trucks: OperationsMapData["trucks"];
    routeStops: NonNullable<OperationsMapData["activeRoute"]>["stops"];
  };
  selected: SelectedEntity | null;
  onSelect: (selection: SelectedEntity) => void;
  onClear: () => void;
};
export function OperationsMapDetailPanel({
  data,
  visible,
  selected,
  onSelect,
  onClear,
}: PanelProps) {
  if (selected === null)
    return <OperationalList visible={visible} onSelect={onSelect} />;
  const bin =
    selected.type === "bin"
      ? data.bins.find((item) => item.id === selected.id)
      : undefined;
  const report =
    selected.type === "report"
      ? data.reports.find((item) => item.id === selected.id)
      : undefined;
  const truck =
    selected.type === "truck"
      ? data.trucks.find((item) => item.id === selected.id)
      : undefined;
  const stop =
    selected.type === "routeStop"
      ? data.activeRoute?.stops.find((item) => item.id === selected.id)
      : undefined;
  if (
    bin === undefined &&
    report === undefined &&
    truck === undefined &&
    stop === undefined
  )
    return <OperationalList visible={visible} onSelect={onSelect} />;
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onClear}>
        ← Back to operational list
      </Button>
      {bin && (
        <Details title={bin.displayId}>
          <Row label="Name" value={bin.name} />
          <Row label="Address" value={bin.address} />
          <Row label="Fill level" value={`${bin.currentFillPercentage}%`} />
          <StatusRow label="Status" status={bin.status} />
          <Row label="Last reading" value={date(bin.lastReadingAt)} />
          <Row label="Device" value={value(bin.deviceIdentifier)} />
          <StatusRow label="Device status" status={bin.deviceStatus} />
          <Row
            label="Active task"
            value={bin.activeTaskDisplayId ?? "No active task"}
          />
          <Row label="Last collection" value={date(bin.lastCollectionAt)} />
          <DataSourceLabel source={bin.source} />
          <DetailLink href={`/dashboard/bins?selected=${bin.id}`} />
        </Details>
      )}
      {report && (
        <Details title={report.referenceNumber}>
          <Row
            label="Category"
            value={
              report.category ? humanizeStatus(report.category) : "Unclassified"
            }
          />
          <div>
            <p className="text-muted-foreground text-xs">Priority</p>
            {report.priority ? (
              <PriorityBadge priority={report.priority} />
            ) : (
              <p>Not yet assigned</p>
            )}
          </div>
          <Row label="Summary" value={report.summary} />
          <Row label="Source" value={humanizeStatus(report.source)} />
          <Row
            label="Location"
            value={
              report.landmarkText ??
              `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
            }
          />
          <Row label="Submitted" value={date(report.submittedAt)} />
          <StatusRow label="Status" status={report.status} />
          <Row
            label="Linked task"
            value={report.linkedTaskDisplayId ?? "No linked task"}
          />
          <DetailLink href={`/dashboard/reports?selected=${report.id}`} />
        </Details>
      )}
      {truck && (
        <Details title={truck.displayId}>
          <Row label="Driver" value={truck.driverName} />
          <StatusRow label="Status" status={truck.status} />
          <Row
            label="Assigned route"
            value={truck.assignedRouteDisplayId ?? "No assigned route"}
          />
          <Row
            label="Current stop"
            value={truck.currentStopNumber?.toString() ?? "Not available"}
          />
          <Row
            label="Remaining stops"
            value={truck.remainingStopCount?.toString() ?? "Not available"}
          />
          <StatusRow label="Maintenance risk" status={truck.maintenanceRisk} />
          <DataSourceLabel source={truck.source} />
          <DetailLink href={`/dashboard/fleet?selected=${truck.id}`} />
        </Details>
      )}
      {stop && (
        <Details title={`Stop ${stop.sequenceNumber}`}>
          <Row label="Task" value={stop.taskDisplayId} />
          <div>
            <p className="text-muted-foreground text-xs">Task priority</p>
            <PriorityBadge priority={stop.taskPriority} />
          </div>
          <Row label="Reason" value={stop.taskReason} />
          <StatusRow label="Stop status" status={stop.status} />
          <Row label="Completed" value={date(stop.completedAt)} />
          <Row
            label="Coordinates"
            value={`${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`}
          />
          <DetailLink href={`/dashboard/tasks?selected=${stop.taskId}`} />
        </Details>
      )}
    </div>
  );
}
function OperationalList({
  visible,
  onSelect,
}: Pick<PanelProps, "visible" | "onSelect">) {
  const groups = [
    {
      title: "Smart Bins",
      type: "bin" as const,
      items: visible.bins,
      label: (item: OperationsMapData["bins"][number]) =>
        `${item.displayId} · ${item.status.replaceAll("_", " ")} · ${item.address}`,
    },
    {
      title: "Citizen Reports",
      type: "report" as const,
      items: visible.reports,
      label: (item: OperationsMapData["reports"][number]) =>
        `${item.referenceNumber} · ${item.priority ?? "not yet assigned"} · ${item.landmarkText ?? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}`,
    },
    {
      title: "Trucks",
      type: "truck" as const,
      items: visible.trucks,
      label: (item: OperationsMapData["trucks"][number]) =>
        `${item.displayId} · ${item.status.replaceAll("_", " ")} · ${item.driverName}`,
    },
    {
      title: "Active Route Stops",
      type: "routeStop" as const,
      items: visible.routeStops,
      label: (
        item: NonNullable<OperationsMapData["activeRoute"]>["stops"][number],
      ) =>
        `Stop ${item.sequenceNumber} · ${item.taskDisplayId} · ${item.status.replaceAll("_", " ")}`,
    },
  ];
  return (
    <div className="space-y-5">
      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.title}>
              <h3 className="mb-2 font-medium">{group.title}</h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="hover:bg-muted focus-visible:ring-ring/50 w-full rounded-lg border p-3 text-left text-sm focus-visible:ring-3"
                    onClick={() =>
                      onSelect({
                        type: group.type,
                        id: item.id,
                      } as SelectedEntity)
                    }
                  >
                    {group.label(item as never)}
                  </button>
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}
function Details({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
function StatusRow({
  label,
  status,
}: {
  label: string;
  status: string | undefined;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      {status ? (
        <StatusBadge status={status} />
      ) : (
        <p className="text-sm">Not available</p>
      )}
    </div>
  );
}
function DetailLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-primary inline-block text-sm font-medium hover:underline"
    >
      Open full details
    </Link>
  );
}
