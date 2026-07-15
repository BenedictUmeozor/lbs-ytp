"use client";

import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";

import type { OverviewData } from "@/components/dashboard/overview-types";

type OperationsMapData = OverviewData["map"];

const BIN_STATUS_COLOR: Record<string, string> = {
  normal: "#16a34a",
  approaching_full: "#eab308",
  collection_required: "#dc2626",
  critical: "#7f1d1d",
  awaiting_confirmation: "#94a3b8",
};

const REPORT_COLOR = "#9333ea";
const TRUCK_ACTIVE_STATUSES = new Set([
  "on_route",
  "at_collection_point",
  "returning",
  "assigned",
]);
const TRUCK_ACTIVE_COLOR = "#2563eb";
const TRUCK_IDLE_COLOR = "#93c5fd";
const DEPOT_COLOR = "#4338ca";
const ROUTE_LINE_COLOR = "#2563eb";

const FALLBACK_CENTER: [number, number] = [6.5385, 3.3868];

export function OperationsMapPreviewClient({
  depot,
  bins,
  reports,
  trucks,
  activeRoutePath,
}: OperationsMapData) {
  const center: [number, number] = depot
    ? [depot.latitude, depot.longitude]
    : FALLBACK_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-full w-full"
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      zoomControl={false}
      boxZoom={false}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {activeRoutePath.length > 1 ? (
        <Polyline
          positions={activeRoutePath.map((point) => [
            point.latitude,
            point.longitude,
          ])}
          pathOptions={{ color: ROUTE_LINE_COLOR, weight: 3, dashArray: "6 6" }}
        />
      ) : null}

      {depot ? (
        <CircleMarker
          center={[depot.latitude, depot.longitude]}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: DEPOT_COLOR,
            fillOpacity: 1,
          }}
        />
      ) : null}

      {bins.map((bin) => (
        <CircleMarker
          key={bin.id}
          center={[bin.latitude, bin.longitude]}
          radius={bin.status === "critical" ? 8 : 6}
          pathOptions={{
            color: bin.status === "critical" ? "#ffffff" : "transparent",
            weight: bin.status === "critical" ? 2 : 0,
            fillColor: BIN_STATUS_COLOR[bin.status] ?? BIN_STATUS_COLOR.normal,
            fillOpacity: 0.9,
          }}
        />
      ))}

      {reports.map((report) => (
        <CircleMarker
          key={report.id}
          center={[report.latitude, report.longitude]}
          radius={6}
          pathOptions={{
            color: "transparent",
            fillColor: REPORT_COLOR,
            fillOpacity: 0.9,
          }}
        />
      ))}

      {trucks.map((truck) => (
        <CircleMarker
          key={truck.id}
          center={[truck.latitude, truck.longitude]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            weight: 1.5,
            fillColor: TRUCK_ACTIVE_STATUSES.has(truck.status)
              ? TRUCK_ACTIVE_COLOR
              : TRUCK_IDLE_COLOR,
            fillOpacity: 0.95,
          }}
        />
      ))}
    </MapContainer>
  );
}
