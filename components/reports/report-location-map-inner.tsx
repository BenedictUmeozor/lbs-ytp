"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

/**
 * Fit the map to all known points so both markers are visible.
 * Renders as a no-op after initial mount.
 */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 16);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export function ReportLocationMapInner({
  operationalLatitude,
  operationalLongitude,
  submittedLatitude,
  submittedLongitude,
  referenceNumber,
}: {
  operationalLatitude?: number;
  operationalLongitude?: number;
  submittedLatitude?: number;
  submittedLongitude?: number;
  referenceNumber: string;
}) {
  const hasResolved =
    operationalLatitude !== undefined &&
    operationalLongitude !== undefined &&
    Number.isFinite(operationalLatitude) &&
    Number.isFinite(operationalLongitude);
  const hasSubmitted =
    submittedLatitude !== undefined &&
    submittedLongitude !== undefined &&
    Number.isFinite(submittedLatitude) &&
    Number.isFinite(submittedLongitude);

  // Fall back to submitted coords when resolved is unavailable
  const center: [number, number] = hasResolved
    ? [operationalLatitude!, operationalLongitude!]
    : hasSubmitted
      ? [submittedLatitude!, submittedLongitude!]
      : [6.44, 3.43]; // approximate Bariga center — should never render

  const submittedIsDistinct =
    hasResolved &&
    hasSubmitted &&
    (Math.abs(submittedLatitude! - operationalLatitude!) > 0.00001 ||
      Math.abs(submittedLongitude! - operationalLongitude!) > 0.00001);

  const points: [number, number][] = [];
  if (hasResolved) points.push([operationalLatitude!, operationalLongitude!]);
  if (hasSubmitted && submittedIsDistinct)
    points.push([submittedLatitude!, submittedLongitude!]);

  // When only submitted exists show a single marker
  const onlySubmitted = !hasResolved && hasSubmitted;

  return (
    <MapContainer
      center={center}
      zoom={16}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />

      {hasResolved && (
        <CircleMarker
          center={[operationalLatitude!, operationalLongitude!]}
          radius={8}
          pathOptions={{ color: "#7c3aed" }}
        >
          <Tooltip permanent direction="top">
            {onlySubmitted || submittedIsDistinct
              ? "Operational location"
              : referenceNumber}
          </Tooltip>
        </CircleMarker>
      )}

      {hasSubmitted && (onlySubmitted || submittedIsDistinct) && (
        <CircleMarker
          center={[submittedLatitude!, submittedLongitude!]}
          radius={7}
          pathOptions={{ color: "#2563eb", fillOpacity: 0.25 }}
        >
          <Tooltip permanent direction={hasResolved ? "bottom" : "top"}>
            {onlySubmitted
              ? `${referenceNumber} (submitted GPS)`
              : "Submitted GPS pin"}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
