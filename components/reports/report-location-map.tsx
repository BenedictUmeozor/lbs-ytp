"use client";

import dynamic from "next/dynamic";

const ReportLocationMapInner = dynamic(
  () =>
    import("./report-location-map-inner").then(
      (module) => module.ReportLocationMapInner,
    ),
  {
    ssr: false,
    loading: () => <div className="bg-muted h-full w-full animate-pulse" />,
  },
);

export function ReportLocationMap(props: {
  latitude?: number;
  longitude?: number;
  submittedLatitude?: number;
  submittedLongitude?: number;
  referenceNumber: string;
}) {
  if (props.latitude === undefined || props.longitude === undefined)
    return null;
  return (
    <ReportLocationMapInner
      latitude={props.latitude}
      longitude={props.longitude}
      submittedLatitude={props.submittedLatitude}
      submittedLongitude={props.submittedLongitude}
      referenceNumber={props.referenceNumber}
    />
  );
}
