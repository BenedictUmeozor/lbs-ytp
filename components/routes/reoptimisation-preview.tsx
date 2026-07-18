"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getRouteActionError } from "./route-error";
import { formatDistance, formatDuration, type ActiveRouteOperations, type ReoptimisationCandidate } from "./route-types";

export function ReoptimisationPreview({ route, candidate, onClose }: { route: ActiveRouteOperations; candidate: ReoptimisationCandidate; onClose: () => void }) {
  const preview = useQuery(api.routeManagement.getReoptimisationPreview, { routeId: route.route.id, candidateTaskId: candidate.id });
  const confirm = useMutation(api.routeManagement.confirmReoptimisation);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const label = (taskId: string) => route.stops.find((stop) => stop.taskId === taskId)?.taskDisplayId ?? (taskId === candidate.id ? `${candidate.displayId} (new)` : taskId);
  const submit = async () => {
    if (!preview || !window.confirm("Confirm this re-optimisation? The route order will change.")) return;
    setRunning(true); setMessage(null);
    try { await confirm({ routeId: route.route.id, candidateTaskId: candidate.id, expectedRouteState: preview.expectedRouteState, proposedTaskOrder: preview.proposedTaskOrder, expectedCurrentStopIndex: preview.expectedCurrentStopIndex, expectedCandidateLatitude: preview.candidate.latitude, expectedCandidateLongitude: preview.candidate.longitude }); onClose(); }
    catch (error) { setMessage(getRouteActionError(error)); }
    finally { setRunning(false); }
  };
  if (preview === undefined) return <Card><CardContent className="py-6 text-sm">Preparing route review…</CardContent></Card>;
  return <Card><CardHeader><CardTitle>Review re-optimisation · {candidate.displayId}</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
    <p>{candidate.reason} · {candidate.isNearRoute ? "Near the remaining route" : "Outside the 1 km route-review radius"} · {(candidate.distanceMeters / 1000).toFixed(2)} km</p>
    <div className="grid gap-4 md:grid-cols-2"><Order title="Current remaining order" ids={[route.stops.find((stop) => stop.isOperationalCurrent)?.taskId, ...preview.existingFutureOrder.map((id) => route.stops.find((stop) => stop.id === id)?.taskId)].filter((id): id is Id<"collectionTasks"> => id !== undefined)} label={label} /><Order title="Proposed remaining order" ids={preview.proposedTaskOrder.slice(preview.expectedCurrentStopIndex)} label={label} moved={new Set(preview.movedTaskIds)} /></div>
    <div className="grid gap-2 sm:grid-cols-2"><p>Current: {formatDistance(preview.currentRemainingMetrics.remainingDistanceKm)} · {formatDuration(preview.currentRemainingMetrics.remainingEstimatedDurationMinutes)}</p><p>Proposed: {formatDistance(preview.proposedRemainingMetrics.remainingDistanceKm)} · {formatDuration(preview.proposedRemainingMetrics.remainingEstimatedDurationMinutes)}</p><p>Current simulated penalties: +{preview.currentRemainingMetrics.remainingTrafficPenaltyMinutes} / +{preview.currentRemainingMetrics.remainingRoadConditionPenaltyMinutes} min</p><p>Proposed simulated penalties: +{preview.proposedRemainingMetrics.remainingTrafficPenaltyMinutes} / +{preview.proposedRemainingMetrics.remainingRoadConditionPenaltyMinutes} min</p></div>
    <p className="text-muted-foreground">{preview.explanation}</p>{message && <p role="status">{message}</p>}<div className="flex gap-2"><Button disabled={running} onClick={() => void submit()}>{running ? "Confirming…" : "Confirm re-optimisation"}</Button><Button variant="ghost" disabled={running} onClick={onClose}>Keep current route</Button></div>
  </CardContent></Card>;
}
function Order({ title, ids, label, moved }: { title: string; ids: string[]; label: (id: string) => string; moved?: Set<Id<"collectionTasks">> }) { return <section><h3 className="mb-1 font-medium">{title}</h3><ol className="space-y-1">{ids.map((id, index) => <li key={id}>{index + 1}. {label(id)} {moved?.has(id as Id<"collectionTasks">) ? "(moved)" : ""}</li>)}</ol></section>; }
