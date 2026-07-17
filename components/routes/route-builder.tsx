"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { ContentCardSkeleton } from "@/components/dashboard/loading-skeleton";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

import { getRouteActionError } from "./route-error";
import { taskPriorityLabel } from "./route-types";

export function RouteBuilder({ onCreated }: { onCreated: (routeId: string) => void }) {
  const data = useQuery(api.routeManagement.getRouteBuilderData);
  const generate = useMutation(api.routeManagement.generateProposedRoute);
  const [truckId, setTruckId] = useState<Id<"trucks"> | "">("");
  const [taskIds, setTaskIds] = useState<Id<"collectionTasks">[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  if (data === undefined) return <ContentCardSkeleton rows={6} titleWidth="w-32" />;
  const toggle = (id: Id<"collectionTasks">) => setTaskIds((selected) => selected.includes(id) ? selected.filter((value) => value !== id) : selected.length < data.settings.effectiveMaximumStops ? [...selected, id] : selected);
  const submit = async () => {
    if (!truckId || taskIds.length === 0) return;
    setRunning(true); setMessage(null);
    try {
      const result = await generate({ truckId, taskIds });
      setTruckId(""); setTaskIds([]); onCreated(result.routeId);
    } catch (error) { setMessage(getRouteActionError(error)); setRunning(false); }
  };
  return <Card>
    <CardHeader><CardTitle>Route builder</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm">AI-assisted route optimisation using urgency, fill level, distance and simulated traffic and road-condition penalties.</p>
      <p className="text-muted-foreground text-sm">Traffic and road-condition penalties are simulated. No live Lagos traffic data is used.</p>
      <label className="block text-sm font-medium">Eligible truck
        <select className="bg-background mt-1 block w-full rounded border p-2" value={truckId} onChange={(event) => setTruckId(event.target.value as Id<"trucks"> | "")}>
          <option value="">Select truck</option>
          {data.trucks.map((truck) => <option key={truck.id} value={truck.id}>{truck.displayId} · {truck.driverName} · {truck.maintenanceRisk} risk · {truck.capacityPercentage}% capacity · {truck.source} data</option>)}
        </select>
      </label>
      <section>
        <div className="mb-2 flex items-center justify-between"><h3 className="font-medium">Eligible pending tasks ({taskIds.length}/{data.settings.effectiveMaximumStops})</h3>{taskIds.length > 0 && <Button size="sm" variant="ghost" onClick={() => setTaskIds([])}>Clear selection</Button>}</div>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {data.tasks.map((task) => { const selected = taskIds.includes(task.id); const disabled = !selected && taskIds.length >= data.settings.effectiveMaximumStops; return <label key={task.id} className="border-border flex gap-3 rounded border p-3 text-sm">
            <input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggle(task.id)} />
            <span className="min-w-0 flex-1"><span className="font-medium">{task.displayId}</span> · {task.sourceType} · {task.sourceReference ?? "—"}<br />{task.locationLabel ?? `${task.latitude.toFixed(5)}, ${task.longitude.toFixed(5)}`} · {task.reason}{task.smartBinFillPercentage !== undefined ? ` · ${task.smartBinFillPercentage}% full` : ""}</span>
            <PriorityBadge priority={task.priority} /><span className="sr-only">{taskPriorityLabel(task.priority)}</span>
          </label>; })}
          {data.tasks.length === 0 && <p className="text-muted-foreground text-sm">No eligible pending tasks.</p>}
        </div>
      </section>
      <Button disabled={running || !truckId || taskIds.length === 0 || taskIds.length > data.settings.effectiveMaximumStops} onClick={submit}>{running ? "Generating…" : "Generate proposed route"}</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent>
  </Card>;
}
