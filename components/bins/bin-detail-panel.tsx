"use client";

import { useState } from "react";

import { DataSourceLabel } from "@/components/dashboard/data-source-label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BinActions } from "./bin-actions";
import { BinFillHistory } from "./bin-fill-history";
import type { BinDetail } from "./bin-types";

const time = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);
export function BinDetailPanel({ detail }: { detail: BinDetail }) {
  const [unusualOnly, setUnusualOnly] = useState(false);
  const readings = unusualOnly
    ? detail.readings.filter((reading) => reading.unusualReading)
    : detail.readings;
  const showUnusual = () => {
    setUnusualOnly(true);
    document.getElementById("recent-readings")?.focus();
  };
  const bin = detail.row;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {bin.displayId} · {bin.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Address: {bin.address}</p>
          <p>
            Coordinates: {bin.latitude}, {bin.longitude}
          </p>
          <p>Fill: {bin.currentFillPercentage}%</p>
          <p>
            Status: <StatusBadge status={bin.status} />
          </p>
          <p>Device: {bin.deviceIdentifier ?? "None"}</p>
          <p>
            Connectivity:{" "}
            {bin.deviceStatus ? <StatusBadge status={bin.deviceStatus} /> : "—"}
          </p>
          <p>Device last seen: {time(bin.deviceLastSeenAt)}</p>
          <p>Last sensor reading: {time(bin.lastReadingAt)}</p>
          <p>Last collection: {time(bin.lastCollectionAt)}</p>
          <p>
            Source: <DataSourceLabel source={bin.source} />
          </p>
          <p>
            Awaiting confirmation:{" "}
            {bin.awaitingEmptyConfirmation ? "Yes" : "No"}
          </p>
          <p>
            Active task:{" "}
            {bin.activeTask
              ? `${bin.activeTask.displayId} (${bin.activeTask.status})`
              : "None"}
          </p>
        </div>
        <BinActions detail={detail} onShowUnusual={showUnusual} />
        <section>
          <h3 className="mb-2 font-medium">Fill-level history</h3>
          <BinFillHistory readings={detail.readings} />
        </section>
        <section id="recent-readings" tabIndex={-1}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-medium">Recent readings</h3>
            <label className="text-sm">
              <input
                type="checkbox"
                checked={unusualOnly}
                onChange={(event) => setUnusualOnly(event.target.checked)}
              />{" "}
              Unusual only
            </label>
          </div>
          {unusualOnly && readings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No unusual readings exist.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Recorded</th>
                    <th>Received</th>
                    <th>Fill</th>
                    <th>Unusual</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id} className="border-t">
                      <td className="py-2">{time(reading.recordedAt)}</td>
                      <td>{time(reading.receivedAt)}</td>
                      <td>{reading.fillPercentage}%</td>
                      <td>{reading.unusualReading ? "Yes — flagged" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-2 font-medium">Collection history</h3>
          {detail.collectionHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No completed collections.
            </p>
          ) : (
            <ul className="text-sm">
              {detail.collectionHistory.map((task) => (
                <li key={task.id}>
                  {task.displayId} · {task.reason} · {time(task.completedAt)}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="mb-2 font-medium">Related citizen reports</h3>
          {detail.relatedReports.length === 0 ? (
            <p className="text-muted-foreground text-sm">No linked reports.</p>
          ) : (
            <ul className="text-sm">
              {detail.relatedReports.map((report) => (
                <li key={report.id}>
                  {report.referenceNumber} · {report.summary ?? "No summary"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
