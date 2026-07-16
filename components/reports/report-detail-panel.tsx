"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";

import { getReportActionError } from "./report-error";
import type { ReportDetail } from "./report-types";

const ReportLocationMap = dynamic(
  () => import("./report-location-map").then((m) => m.ReportLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-full w-full animate-pulse rounded" />
    ),
  },
);

const time = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);

type ActionState = { message: string | null; isRunning: boolean };
type ReportCategory =
  | "overflowing_waste"
  | "illegal_dumpsite"
  | "missed_collection"
  | "drainage_blockage"
  | "other";
type Priority = "low" | "medium" | "high" | "critical";

function useActionState() {
  return useState<ActionState>({ message: null, isRunning: false });
}

function categoryLabel(cat: string | undefined) {
  if (cat === undefined) return "None";
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function priorityLabel(p: string | undefined) {
  return p === undefined ? "None" : p.charAt(0).toUpperCase() + p.slice(1);
}

/** AI statuses that indicate processing is still active (lock). */
function isProcessingActive(aiStatus: string | undefined) {
  return aiStatus === "pending" || aiStatus === "processing";
}

/** Terminal statuses that block all manager actions. */
const terminalStatuses = new Set(["resolved", "duplicate", "rejected"]);

function isTerminal(status: string) {
  return terminalStatuses.has(status);
}

export function ReportDetailPanel({ detail }: { detail: ReportDetail }) {
  const r = detail.report;
  const processing = isProcessingActive(r.aiStatus);
  const terminal = isTerminal(r.status);
  const actionable = !terminal && !processing;

  const hasMapPoints =
    r.hasValidOperationalCoordinates ||
    (r.submittedLatitude !== undefined && r.submittedLongitude !== undefined);

  return (
    <div className="space-y-6">
      {processing && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-800">
            Processing… Automated report processing is still running. Actions
            are unavailable until processing finishes.
          </CardContent>
        </Card>
      )}
      {terminal && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="text-muted-foreground pt-4 text-sm">
            This report is {r.status}. Manager actions are unavailable.
          </CardContent>
        </Card>
      )}
      {actionable && <ActionsSection detail={detail} />}
      <Card>
        <CardHeader>
          <CardTitle>
            {r.referenceNumber} · {r.source} report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview grid */}
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Status: <StatusBadge status={r.status} />
            </p>
            <p>
              Source: <StatusBadge status={r.source} />
            </p>
            <p>
              Category: {categoryLabel(r.category)} · Priority:{" "}
              {priorityLabel(r.priority)}
            </p>
            {detail.classificationConfirmation && (
              <p className="text-muted-foreground text-xs">
                Classification confirmed{" "}
                {time(detail.classificationConfirmation.confirmedAt)} by{" "}
                {detail.classificationConfirmation.managerName}
              </p>
            )}
            <p>Resolved location name: {r.resolvedLocationName ?? "—"}</p>
            <p>
              Current operational coordinates:{" "}
              {r.hasValidOperationalCoordinates
                ? `${r.latitude!.toFixed(5)}, ${r.longitude!.toFixed(5)}`
                : "—"}
            </p>
            <p>
              Resolution status:{" "}
              <StatusBadge status={r.locationResolutionStatus ?? "pending"} />
            </p>
            <p>
              Classification confirmation:{" "}
              {detail.classificationConfirmation
                ? "Confirmed"
                : "Not confirmed"}
            </p>
            {detail.linkedTask && (
              <p>
                Linked task:{" "}
                <Link
                  className="underline"
                  href={`/dashboard/tasks?selected=${detail.linkedTask.id}`}
                >
                  {detail.linkedTask.displayId}
                </Link>{" "}
                ({detail.linkedTask.status})
              </p>
            )}
            {detail.candidateTask && (
              <section className="rounded border border-amber-300 bg-amber-50 p-3 sm:col-span-2">
                <h3 className="font-medium">Possible existing task</h3>
                <p className="mt-1 text-sm">
                  {detail.candidateTask.displayId} ·{" "}
                  {detail.candidateTask.sourceType.replaceAll("_", " ")} ·{" "}
                  {detail.candidateTask.priority} ·{" "}
                  {detail.candidateTask.status}
                  {detail.candidateTask.distanceMeters === null
                    ? ""
                    : ` · ${Math.round(detail.candidateTask.distanceMeters)}m`}
                </p>
                <p className="mt-1 text-sm">{detail.candidateTask.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CandidateTaskActions detail={detail} />
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/dashboard/tasks?selected=${detail.candidateTask.id}`}
                    >
                      View task details
                    </Link>
                  </Button>
                  {(detail.candidateTask.sourceBinId ||
                    detail.candidateTask.sourceReportId) && (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/dashboard/map?type=${detail.candidateTask.sourceBinId ? "bin" : "report"}&selected=${detail.candidateTask.sourceBinId ?? detail.candidateTask.sourceReportId}`}
                      >
                        View task location on map
                      </Link>
                    </Button>
                  )}
                </div>
              </section>
            )}
            {detail.linkedBin && (
              <p>
                Linked bin:{" "}
                <Link
                  className="underline"
                  href={`/dashboard/bins?selected=${detail.linkedBin.id}`}
                >
                  {detail.linkedBin.displayId}
                </Link>{" "}
                ({detail.linkedBin.name})
              </p>
            )}
            {detail.duplicateOfReport && (
              <p>
                Duplicate of:{" "}
                <Link
                  className="underline"
                  href={`/dashboard/reports?selected=${detail.duplicateOfReport.id}`}
                >
                  {detail.duplicateOfReport.referenceNumber}
                </Link>
              </p>
            )}
            <p>Submitted: {time(r.submittedAt)}</p>
            {r.resolvedAt !== undefined && (
              <p>Resolved: {time(r.resolvedAt)}</p>
            )}
          </div>

          {/* Original message */}
          {r.originalMessage && (
            <section>
              <h3 className="mb-1 font-medium">Original message</h3>
              <p className="bg-muted rounded p-3 text-sm">
                {r.originalMessage}
              </p>
            </section>
          )}

          <section className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Typed landmark: {r.landmarkText ?? "—"}</p>
            <p>
              Submitted GPS pin:{" "}
              {r.submittedLatitude === undefined
                ? "—"
                : `${r.submittedLatitude.toFixed(5)}, ${r.submittedLongitude?.toFixed(5)}`}
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium">AI-assisted assessment</h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                Operational classification: {categoryLabel(r.category)} ·{" "}
                {priorityLabel(r.priority)}
              </p>
              <p>
                Collection recommendation:{" "}
                {r.requiresCollection === undefined
                  ? "—"
                  : r.requiresCollection
                    ? "Collection recommended"
                    : "Investigation recommended"}
              </p>
              <p>
                AI clarification recommendation:{" "}
                {r.aiNeedsClarification === undefined
                  ? "—"
                  : r.aiNeedsClarification
                    ? "Clarification recommended"
                    : "No clarification recommended"}
              </p>
              <p>
                Processing:{" "}
                {r.aiStatus === "fallback" ? "Rules fallback" : r.aiStatus}
                {r.aiStatus === "fallback" ? "" : ` · ${r.aiModel ?? "—"}`}
              </p>
              <p>
                AI-extracted location text: {r.aiExtractedLocationText ?? "—"}
              </p>
              <p>
                Current clarification state:{" "}
                {r.needsClarification === undefined
                  ? "—"
                  : r.needsClarification
                    ? "Clarification required"
                    : "No clarification required"}
              </p>
              <p>Processed: {time(r.aiProcessedAt)}</p>
            </div>
          </section>

          {r.summary && (
            <section>
              <h3 className="mb-1 font-medium">AI summary</h3>
              <p className="text-sm">{r.summary}</p>
            </section>
          )}

          {/* Photo */}
          {detail.photoUrl && (
            <section>
              <h3 className="mb-1 font-medium">Photo</h3>
              {/* Convex storage URLs are authorized dynamically; this avoids adding remote image configuration. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.photoUrl}
                alt={`Report ${r.referenceNumber}`}
                className="max-h-64 rounded object-contain"
              />
            </section>
          )}

          {/* Map — shown when resolved coords OR submitted coords exist */}
          {hasMapPoints && (
            <section>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-medium">Location</h3>
                {r.hasValidOperationalCoordinates ? (
                  <Link
                    className="text-sm underline"
                    href={`/dashboard/map?type=report&selected=${r.id}`}
                  >
                    Open on operations map
                  </Link>
                ) : null}
              </div>
              <div className="h-64 w-full overflow-hidden rounded">
                <ReportLocationMap
                  operationalLatitude={
                    r.hasValidOperationalCoordinates ? r.latitude : undefined
                  }
                  operationalLongitude={
                    r.hasValidOperationalCoordinates ? r.longitude : undefined
                  }
                  submittedLatitude={r.submittedLatitude}
                  submittedLongitude={r.submittedLongitude}
                />
              </div>
            </section>
          )}

          {/* Status history */}
          {detail.activityHistory.filter(
            (e) => e.previousStatus || e.nextStatus,
          ).length > 0 && (
            <section>
              <h3 className="mb-1 font-medium">Status history</h3>
              <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {detail.activityHistory
                  .filter((e) => e.previousStatus || e.nextStatus)
                  .map((event) => (
                    <p key={event.id} className="text-muted-foreground">
                      <span className="text-foreground">
                        {time(event.eventTime)}
                      </span>
                      : {event.description}
                      {event.previousStatus ? (
                        <>
                          {" "}
                          · From <StatusBadge status={event.previousStatus} />
                        </>
                      ) : null}
                      {event.nextStatus ? (
                        <>
                          {" "}
                          · To <StatusBadge status={event.nextStatus} />
                        </>
                      ) : null}
                      {event.actorName ? ` — ${event.actorName}` : ""}
                    </p>
                  ))}
              </div>
            </section>
          )}

          {/* Nearby possible duplicates */}
          <section>
            <h3 className="mb-1 font-medium">Nearby possible duplicates</h3>
            {detail.nearbyReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No nearby candidates.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.nearbyReports.map((candidate) => (
                  <li key={candidate.id}>
                    <Link
                      className="underline"
                      href={`/dashboard/reports?selected=${candidate.id}`}
                    >
                      {candidate.referenceNumber}
                    </Link>{" "}
                    · {Math.round(candidate.distanceMeters)}m ·{" "}
                    {categoryLabel(candidate.category)} ·{" "}
                    {priorityLabel(candidate.priority)} ·{" "}
                    <StatusBadge status={candidate.status} /> ·{" "}
                    {candidate.summary ?? "No summary"} ·{" "}
                    {candidate.linkedTaskDisplayId ?? "No linked task"} ·{" "}
                    {time(candidate.submittedAt)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity history */}
          {detail.activityHistory.length > 0 && (
            <section>
              <h3 className="mb-1 font-medium">Activity history</h3>
              <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {detail.activityHistory.map((event) => (
                  <p key={event.id} className="text-muted-foreground">
                    <span className="text-foreground">
                      {time(event.eventTime)}
                    </span>
                    : {event.description}
                    {event.actorName ? ` — ${event.actorName}` : ""}
                  </p>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CandidateTaskActions({ detail }: { detail: ReportDetail }) {
  const linkCandidate = useMutation(api.reportManagement.linkCandidateTask);
  const createSeparate = useMutation(
    api.reportManagement.createSeparateCollectionTask,
  );
  const [showSeparate, setShowSeparate] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useActionState();

  const link = async () => {
    if (state.isRunning) return;
    setState({ message: null, isRunning: true });
    try {
      await linkCandidate({ reportId: detail.report.id });
      setState({
        message: "Report linked to the reviewed task.",
        isRunning: false,
      });
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };
  const separate = async () => {
    if (
      state.isRunning ||
      !window.confirm(
        "Create a separate task after reviewing this possible match?",
      )
    )
      return;
    setState({ message: null, isRunning: true });
    try {
      await createSeparate({ reportId: detail.report.id, reason });
      setState({ message: "Separate task created.", isRunning: false });
      setShowSeparate(false);
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  if (showSeparate)
    return (
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Reason for a separate task
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why this needs its own task"
          />
        </label>
        <Button
          size="sm"
          disabled={state.isRunning || reason.trim().length < 3}
          onClick={separate}
        >
          {state.isRunning ? "Creating…" : "Confirm separate task"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowSeparate(false)}
        >
          Close
        </Button>
        {state.message && (
          <p className="w-full text-sm" role="status">
            {state.message}
          </p>
        )}
      </div>
    );
  return (
    <>
      <Button size="sm" onClick={link} disabled={state.isRunning}>
        {state.isRunning ? "Linking…" : "Link to this task"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setShowSeparate(true)}>
        Create separate task
      </Button>
      {state.message && (
        <p className="w-full text-sm" role="status">
          {state.message}
        </p>
      )}
    </>
  );
}

/* ─── Action forms ─────────────────────────────────────────────── */

type ActionName =
  | "classification"
  | "coordinates"
  | "clarification"
  | "create_task"
  | "link_task"
  | "duplicate"
  | "reject"
  | "resolve";

function ActionsSection({ detail }: { detail: ReportDetail }) {
  const [activeForm, setActiveForm] = useState<ActionName | null>(null);
  const close = () => setActiveForm(null);
  const r = detail.report;
  const hasActiveTask =
    detail.linkedTask !== null &&
    ["pending", "scheduled", "assigned", "en_route"].includes(
      detail.linkedTask.status,
    );
  const hasCoords = r.hasValidOperationalCoordinates;
  const classificationAvailable =
    r.category !== undefined && r.priority !== undefined;
  const canCoordinate = !hasActiveTask;
  const canTask = hasCoords && !hasActiveTask && classificationAvailable;
  const canLink =
    hasCoords && !hasActiveTask && detail.eligibleTasks.length > 0;
  const canDuplicate =
    hasCoords && !hasActiveTask && detail.nearbyReports.length > 0;
  const canResolve =
    detail.linkedTask === null || detail.linkedTask.status === "collected";
  const availability = useMemo(
    () =>
      ({
        classification: true,
        coordinates: canCoordinate,
        clarification: !hasActiveTask,
        create_task: canTask,
        link_task: canLink,
        duplicate: canDuplicate,
        reject: !hasActiveTask,
        resolve: canResolve,
      }) as const,
    [canCoordinate, canDuplicate, canLink, canResolve, canTask, hasActiveTask],
  );
  const activeFormAvailable = activeForm === null || availability[activeForm];

  useEffect(() => {
    if (activeForm === null || availability[activeForm]) return;
    const timeout = window.setTimeout(() => setActiveForm(null));
    return () => window.clearTimeout(timeout);
  }, [activeForm, availability]);

  const actions: [ActionName, string][] = [
    ["classification", "Classification"],
    ["coordinates", "Update coordinates"],
    ["clarification", "Request info"],
    ["create_task", "Create task"],
    ["link_task", "Link task"],
    ["duplicate", "Mark duplicate"],
    ["reject", "Reject"],
    ["resolve", "Resolve"],
  ];

  if (activeForm === null || !activeFormAvailable) {
    return (
      <Card>
        <CardContent className="space-y-2 pt-4">
          <div className="flex flex-wrap gap-2">
            {actions.map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant="outline"
                disabled={!availability[id]}
                onClick={() => availability[id] && setActiveForm(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          {!activeFormAvailable && (
            <p className="text-muted-foreground text-xs">
              This action is no longer available after a live update.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Unavailable actions require settled processing, valid coordinates,
            or an eligible task as applicable.
          </p>
        </CardContent>
      </Card>
    );
  }

  switch (activeForm) {
    case "classification":
      return (
        <ClassificationForm
          detail={detail}
          key="classification"
          onClose={close}
        />
      );
    case "coordinates":
      return (
        <CoordinatesForm detail={detail} key="coordinates" onClose={close} />
      );
    case "clarification":
      return (
        <ClarificationForm
          detail={detail}
          key="clarification"
          onClose={close}
        />
      );
    case "create_task":
      return (
        <CreateTaskForm detail={detail} key="create_task" onClose={close} />
      );
    case "link_task":
      return <LinkTaskForm detail={detail} key="link_task" onClose={close} />;
    case "duplicate":
      return <DuplicateForm detail={detail} key="duplicate" onClose={close} />;
    case "reject":
      return <RejectForm detail={detail} key="reject" onClose={close} />;
    case "resolve":
      return <ResolveForm detail={detail} key="resolve" onClose={close} />;
    default:
      return null;
  }
}

/* ─── Classification ────────────────────────────────────────────── */

function ClassificationForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const confirm = useMutation(api.reportManagement.confirmClassification);
  const update = useMutation(api.reportManagement.updateClassification);
  const [category, setCategory] = useState<ReportCategory>(
    detail.report.category ?? "overflowing_waste",
  );
  const [priority, setPriority] = useState<Priority>(
    detail.report.priority ?? "medium",
  );
  const [state, setState] = useActionState();
  const r = detail.report;

  const run = async (
    action: () => Promise<{ changed: boolean } | null>,
    success: string,
  ) => {
    if (state.isRunning) return;
    setState({ message: null, isRunning: true });
    try {
      const result = await action();
      setState({
        message: result?.changed === false ? "No changes needed." : success,
        isRunning: false,
      });
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  const canEditClassification = true;
  const canConfirmClassification =
    r.category !== undefined &&
    r.priority !== undefined &&
    r.classificationConfirmedAt === undefined;

  const handleConfirm = () => {
    if (!canConfirmClassification) return;
    return run(() => confirm({ reportId: r.id }), "Classification confirmed.");
  };

  const handleUpdate = () =>
    run(
      () => update({ reportId: r.id, category: category, priority: priority }),
      "Classification updated.",
    );

  return (
    <ActionFormCard title="Classification" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      <label className="block text-sm">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ReportCategory)}
          className="bg-background mt-1 block w-full rounded border p-2"
        >
          <option value="overflowing_waste">Overflowing waste</option>
          <option value="illegal_dumpsite">Illegal dumpsite</option>
          <option value="missed_collection">Missed collection</option>
          <option value="drainage_blockage">Drainage blockage</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="mt-2 block text-sm">
        Priority
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="bg-background mt-1 block w-full rounded border p-2"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          disabled={state.isRunning || !canConfirmClassification}
          onClick={handleConfirm}
        >
          {state.isRunning ? "Working…" : "Confirm"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={state.isRunning || !canEditClassification}
          onClick={handleUpdate}
        >
          {state.isRunning ? "Working…" : "Save"}
        </Button>
      </div>
    </ActionFormCard>
  );
}

/* ─── Coordinates ───────────────────────────────────────────────── */

function CoordinatesForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const updateCoordinates = useMutation(
    api.reportManagement.updateResolvedCoordinates,
  );
  const [lat, setLat] = useState(String(detail.report.latitude ?? ""));
  const [lng, setLng] = useState(String(detail.report.longitude ?? ""));
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (state.isRunning) return;
    setState({ message: null, isRunning: true });
    try {
      await updateCoordinates({
        reportId: detail.report.id,
        latitude: Number(lat),
        longitude: Number(lng),
      });
      setState({ message: "Coordinates updated.", isRunning: false });
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  return (
    <ActionFormCard title="Update resolved coordinates" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Latitude
          <Input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          Longitude
          <Input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </label>
      </div>
      <Button
        size="sm"
        className="mt-3"
        disabled={state.isRunning}
        onClick={handleSubmit}
      >
        {state.isRunning ? "Saving…" : "Save coordinates"}
      </Button>
    </ActionFormCard>
  );
}

/* ─── Clarification ─────────────────────────────────────────────── */

function ClarificationForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const requestInfo = useMutation(api.reportManagement.requestMoreInformation);
  const [note, setNote] = useState("");
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (state.isRunning) return;
    setState({ message: null, isRunning: true });
    try {
      await requestInfo({ reportId: detail.report.id, note });
      setState({
        message: "Report marked as requiring more information.",
        isRunning: false,
      });
      setNote("");
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  return (
    <ActionFormCard title="Request more information" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      <label className="block text-sm">
        Clarification note
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What additional information is needed?"
          required
        />
      </label>
      <p className="text-muted-foreground mt-2 text-xs">
        This records the information needed and updates the public status. No
        message is sent to the resident yet.
      </p>
      <Button
        size="sm"
        className="mt-3"
        disabled={state.isRunning}
        onClick={handleSubmit}
      >
        {state.isRunning ? "Updating…" : "Request more information"}
      </Button>
    </ActionFormCard>
  );
}

/* ─── Create task ────────────────────────────────────────────────── */

function CreateTaskForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const createTask = useMutation(api.reportManagement.createCollectionTask);
  const [priority, setPriority] = useState<Priority>("high");
  const [reason, setReason] = useState("");
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (state.isRunning) return;
    setState({ message: null, isRunning: true });
    try {
      const result = await createTask({
        reportId: detail.report.id,
        priority: priority,
        reason,
      });
      if (result.kind === "candidate_found") {
        setState({
          message:
            "A possible existing task needs review before creating another task.",
          isRunning: false,
        });
        return;
      }
      setReason("");
      onClose();
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  return (
    <ActionFormCard title="Create collection task" onClose={onClose}>
      {detail.report.requiresCollection === false && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
          AI recommended investigation rather than immediate collection. A fleet
          manager may still create a task manually.
        </p>
      )}
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      <label className="block text-sm">
        Priority
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="bg-background mt-1 block w-full rounded border p-2"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <label className="mt-2 block text-sm">
        Reason
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is collection needed?"
          required
        />
      </label>
      <Button
        size="sm"
        className="mt-3"
        disabled={state.isRunning}
        onClick={handleSubmit}
      >
        {state.isRunning ? "Creating…" : "Create task"}
      </Button>
    </ActionFormCard>
  );
}

/* ─── Link existing task ──────────────────────────────────────────── */

function LinkTaskForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const linkTask = useMutation(api.reportManagement.linkExistingTask);
  const [taskId, setTaskId] = useState<Id<"collectionTasks"> | "">("");
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (state.isRunning || !taskId) return;
    setState({ message: null, isRunning: true });
    try {
      await linkTask({ reportId: detail.report.id, taskId: taskId });
      setTaskId("");
      onClose();
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  const eligible = detail.eligibleTasks;

  return (
    <ActionFormCard title="Link existing task" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      {eligible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No eligible active tasks.
        </p>
      ) : (
        <>
          <label className="block text-sm">
            Select task
            <select
              value={taskId}
              onChange={(e) =>
                setTaskId(e.target.value as Id<"collectionTasks">)
              }
              className="bg-background mt-1 block w-full rounded border p-2"
            >
              <option value="">— Select a task —</option>
              {eligible.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayId} ({t.status}, {t.priority})
                  {t.distanceMeters !== null
                    ? ` · ${Math.round(t.distanceMeters)}m`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            className="mt-3"
            disabled={state.isRunning || !taskId}
            onClick={handleSubmit}
          >
            {state.isRunning ? "Linking…" : "Link task"}
          </Button>
        </>
      )}
    </ActionFormCard>
  );
}

/* ─── Mark duplicate ─────────────────────────────────────────────── */

function DuplicateForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const markDup = useMutation(api.reportManagement.markDuplicate);
  const [targetId, setTargetId] = useState<Id<"citizenReports"> | "">("");
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (
      state.isRunning ||
      !targetId ||
      !window.confirm("Mark this report as a duplicate? This cannot be undone.")
    )
      return;
    setState({ message: null, isRunning: true });
    try {
      await markDup({
        reportId: detail.report.id,
        duplicateOfReportId: targetId,
      });
      setState({ message: "Marked as duplicate.", isRunning: false });
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  const nearby = detail.nearbyReports;

  return (
    <ActionFormCard title="Mark as duplicate" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      {nearby.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No nearby open reports to mark as canonical.
        </p>
      ) : (
        <>
          <label className="block text-sm">
            Canonical report
            <select
              value={targetId}
              onChange={(e) =>
                setTargetId(e.target.value as Id<"citizenReports">)
              }
              className="bg-background mt-1 block w-full rounded border p-2"
            >
              <option value="">— Select canonical report —</option>
              {nearby.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.referenceNumber} ({categoryLabel(n.category)},{" "}
                  {priorityLabel(n.priority)}) · {Math.round(n.distanceMeters)}m
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            className="mt-3"
            disabled={state.isRunning || !targetId}
            onClick={handleSubmit}
          >
            {state.isRunning ? "Marking…" : "Mark duplicate"}
          </Button>
        </>
      )}
    </ActionFormCard>
  );
}

/* ─── Reject ─────────────────────────────────────────────────────── */

function RejectForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const reject = useMutation(api.reportManagement.rejectReport);
  const [reason, setReason] = useState("");
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (
      state.isRunning ||
      !window.confirm("Reject this report? This cannot be undone.")
    )
      return;
    setState({ message: null, isRunning: true });
    try {
      await reject({ reportId: detail.report.id, reason });
      setState({ message: "Report rejected.", isRunning: false });
      setReason("");
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  return (
    <ActionFormCard title="Reject report" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      <label className="block text-sm">
        Rejection reason
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this report being rejected?"
          required
        />
      </label>
      <Button
        size="sm"
        className="mt-3"
        variant="destructive"
        disabled={state.isRunning}
        onClick={handleSubmit}
      >
        {state.isRunning ? "Rejecting…" : "Reject report"}
      </Button>
    </ActionFormCard>
  );
}

/* ─── Resolve ────────────────────────────────────────────────────── */

function ResolveForm({
  detail,
  onClose,
}: {
  detail: ReportDetail;
  onClose: () => void;
}) {
  const resolve = useMutation(api.reportManagement.resolveReport);
  const [note, setNote] = useState("");
  const [state, setState] = useActionState();

  const handleSubmit = async () => {
    if (
      state.isRunning ||
      !window.confirm("Resolve this report? This cannot be undone.")
    )
      return;
    setState({ message: null, isRunning: true });
    try {
      await resolve({
        reportId: detail.report.id,
        ...(note.trim() ? { note } : {}),
      });
      setState({ message: "Report resolved.", isRunning: false });
      setNote("");
    } catch (error) {
      setState({ message: getReportActionError(error), isRunning: false });
    }
  };

  return (
    <ActionFormCard title="Resolve report" onClose={onClose}>
      {state.message && (
        <p className="mb-2 text-sm" role="status">
          {state.message}
        </p>
      )}
      <label className="block text-sm">
        Resolution note (optional)
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional resolution note"
        />
      </label>
      <Button
        size="sm"
        className="mt-3"
        disabled={state.isRunning}
        onClick={handleSubmit}
      >
        {state.isRunning ? "Resolving…" : "Resolve report"}
      </Button>
    </ActionFormCard>
  );
}

/* ─── Shared form card ───────────────────────────────────────────── */

function ActionFormCard({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
