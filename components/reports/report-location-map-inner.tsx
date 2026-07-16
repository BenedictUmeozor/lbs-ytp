"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

export function ReportLocationMapInner({
  latitude,
  longitude,
  submittedLatitude,
  submittedLongitude,
  referenceNumber,
}: {
  latitude: number;
  longitude: number;
  submittedLatitude?: number;
  submittedLongitude?: number;
  referenceNumber: string;
}) {
  const submittedIsDistinct =
    submittedLatitude !== undefined &&
    submittedLongitude !== undefined &&
    (Math.abs(submittedLatitude - latitude) > 0.00001 ||
      Math.abs(submittedLongitude - longitude) > 0.00001);
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[latitude, longitude]}
        radius={8}
        pathOptions={{ color: "#7c3aed" }}
      >
        <Tooltip permanent direction="top">
          {submittedIsDistinct
            ? "Current operational location"
            : referenceNumber}
        </Tooltip>
      </CircleMarker>
      {submittedIsDistinct &&
      submittedLatitude !== undefined &&
      submittedLongitude !== undefined ? (
        <CircleMarker
          center={[submittedLatitude, submittedLongitude]}
          radius={7}
          pathOptions={{ color: "#2563eb" }}
        >
          <Tooltip permanent direction="top">
            Submitted GPS pin
          </Tooltip>
        </CircleMarker>
      ) : null}
    </MapContainer>
  );
}
