"use client";

import { divIcon, latLngBounds } from "leaflet";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

import type { OperationsMapData, SelectedEntity } from "./operations-map-types";

const COLORS: Record<string, string> = { normal: "#16a34a", approaching_full: "#eab308", collection_required: "#dc2626", critical: "#7f1d1d" };
const activeStatuses = new Set(["assigned", "on_route", "at_collection_point", "returning"]);

function selected(selection: SelectedEntity | null, type: SelectedEntity["type"], id: string) { return selection?.type === type && selection.id === id; }
function depotIcon() { return divIcon({ className: "operations-map-depot-icon", html: '<span>Depot</span>', iconSize: [48, 28], iconAnchor: [24, 14] }); }
function stopIcon(sequence: number, isCompleted: boolean, isSelected: boolean) { return divIcon({ className: "operations-map-stop-icon", html: `<span class="${isCompleted ? "operations-map-stop-completed" : ""} ${isSelected ? "operations-map-selected" : ""}">${sequence}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }); }

function MapController({ points, focusCoordinates, viewKey }: { points: [number, number][]; focusCoordinates: [number, number] | null; viewKey: string }) {
  const map = useMap();
  const previousViewKey = useRef("");
  const previousFocus = useRef<string | null>(null);
  useEffect(() => { const resize = () => map.invalidateSize(); resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, [map]);
  useEffect(() => { if (viewKey !== previousViewKey.current && points.length > 0) { previousViewKey.current = viewKey; map.fitBounds(latLngBounds(points), { padding: [32, 32], maxZoom: 16 }); } }, [map, points, viewKey]);
  useEffect(() => { const key = focusCoordinates?.join(",") ?? null; if (key !== null && key !== previousFocus.current) { previousFocus.current = key; map.flyTo(focusCoordinates!, Math.max(map.getZoom(), 16)); } }, [focusCoordinates, map]);
  return null;
}

export function LiveOperationsMapClient({ data, visible, selected: selection, focusCoordinates, onSelect }: { data: OperationsMapData; visible: { bins: OperationsMapData["bins"]; reports: OperationsMapData["reports"]; trucks: OperationsMapData["trucks"]; routeStops: NonNullable<OperationsMapData["activeRoute"]>["stops"]; depot: boolean; route: boolean }; selected: SelectedEntity | null; focusCoordinates: [number, number] | null; viewKey: string; onSelect: (selection: SelectedEntity) => void }) {
  const route = data.activeRoute;
  const points: [number, number][] = [
    ...(visible.depot ? [[data.depot.latitude, data.depot.longitude] as [number, number]] : []),
    ...visible.bins.map((item) => [item.latitude, item.longitude] as [number, number]),
    ...visible.reports.map((item) => [item.latitude, item.longitude] as [number, number]),
    ...visible.trucks.map((item) => [item.latitude, item.longitude] as [number, number]),
    ...visible.routeStops.map((item) => [item.latitude, item.longitude] as [number, number]),
  ];
  return <MapContainer center={[data.depot.latitude, data.depot.longitude]} zoom={14} className="h-full w-full" scrollWheelZoom keyboard zoomControl attributionControl><MapController points={points} focusCoordinates={focusCoordinates} viewKey={viewKey} /><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
    {visible.route && route !== null && <Polyline positions={[[route.depotLatitude, route.depotLongitude] as [number, number], ...route.stops.map((stop) => [stop.latitude, stop.longitude] as [number, number])]} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6 6" }} />}
    {visible.depot && <Marker position={[data.depot.latitude, data.depot.longitude]} icon={depotIcon()}><Tooltip permanent direction="top">Depot: {data.depot.label}</Tooltip></Marker>}
    {visible.bins.map((bin) => <CircleMarker key={bin.id} center={[bin.latitude, bin.longitude]} radius={selected(selection, "bin", bin.id) ? 10 : bin.status === "critical" ? 8 : 6} pathOptions={{ color: selected(selection, "bin", bin.id) ? "#111827" : bin.status === "critical" ? "#fff" : "transparent", weight: selected(selection, "bin", bin.id) ? 3 : bin.status === "critical" ? 2 : 0, fillColor: COLORS[bin.status] ?? "#16a34a", fillOpacity: 0.95, className: bin.status === "critical" ? "operations-map-critical-marker" : undefined }} eventHandlers={{ click: () => onSelect({ type: "bin", id: bin.id }) }}><Tooltip>{bin.displayId}: {bin.status.replaceAll("_", " ")}</Tooltip></CircleMarker>)}
    {visible.reports.map((report) => <CircleMarker key={report.id} center={[report.latitude, report.longitude]} radius={selected(selection, "report", report.id) ? 9 : 6} pathOptions={{ color: selected(selection, "report", report.id) ? "#111827" : "transparent", weight: selected(selection, "report", report.id) ? 3 : 0, fillColor: "#9333ea", fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelect({ type: "report", id: report.id }) }}><Tooltip>{report.referenceNumber}: {report.priority ?? "not yet assigned"}</Tooltip></CircleMarker>)}
    {visible.trucks.map((truck) => <CircleMarker key={truck.id} center={[truck.latitude, truck.longitude]} radius={selected(selection, "truck", truck.id) ? 10 : 7} pathOptions={{ color: selected(selection, "truck", truck.id) ? "#111827" : "#fff", weight: selected(selection, "truck", truck.id) ? 3 : 1.5, fillColor: activeStatuses.has(truck.status) ? "#2563eb" : "#93c5fd", fillOpacity: 0.95 }} eventHandlers={{ click: () => onSelect({ type: "truck", id: truck.id }) }}><Tooltip>{truck.displayId}: {truck.status.replaceAll("_", " ")}</Tooltip></CircleMarker>)}
    {visible.routeStops.map((stop) => <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={stopIcon(stop.sequenceNumber, stop.status === "completed", selected(selection, "routeStop", stop.id))} eventHandlers={{ click: () => onSelect({ type: "routeStop", id: stop.id }) }}><Tooltip permanent direction="top">Stop {stop.sequenceNumber}: {stop.status.replaceAll("_", " ")}</Tooltip></Marker>)}
  </MapContainer>;
}
