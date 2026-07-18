import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReoptimisationCandidate } from "./route-types";

export function ReoptimisationCandidates({ candidates, onReview }: { candidates: ReoptimisationCandidate[]; onReview: (candidate: ReoptimisationCandidate) => void }) {
  return <Card><CardHeader><CardTitle>Critical route review</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm">AI-assisted route optimisation using urgency, fill level, distance and simulated traffic and road-condition penalties.</p>
    <p className="text-muted-foreground text-sm">The route will not change until you review and confirm the proposed order. No live Lagos traffic or road-condition data is used.</p>
    {candidates.length === 0 ? <p className="text-muted-foreground text-sm">No Critical pending tasks need review.</p> : <ul className="space-y-3">{candidates.map((candidate) => <li key={candidate.id} className="border-border flex flex-wrap items-start justify-between gap-3 rounded border p-3 text-sm"><div><p className="font-medium">{candidate.displayId} · {candidate.sourceType.replaceAll("_", " ")}</p><p>{candidate.sourceReference ?? "No source reference"} · {candidate.locationLabel ?? `${candidate.latitude.toFixed(5)}, ${candidate.longitude.toFixed(5)}`}</p><p>{candidate.reason}</p><p className="text-muted-foreground">{candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)} · {(candidate.distanceMeters / 1000).toFixed(2)} km · {candidate.isNearRoute ? "Near the remaining route" : "Outside the 1 km route-review radius"}</p>{candidate.unavailabilityReason && <p className="text-destructive">{candidate.unavailabilityReason}</p>}</div>{candidate.canReview && <Button size="sm" onClick={() => onReview(candidate)}>Review re-optimisation</Button>}</li>)}</ul>}
  </CardContent></Card>;
}
