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
  operationalLatitude?: number;
  operationalLongitude?: number;
  submittedLatitude?: number;
  submittedLongitude?: number;
  referenceNumber: string;
}) {
  const hasResolved =
    props.operationalLatitude !== undefined &&
    props.operationalLongitude !== undefined;
  const hasSubmitted =
    props.submittedLatitude !== undefined &&
    props.submittedLongitude !== undefined;

  if (!hasResolved && !hasSubmitted) return null;

  return (
    <ReportLocationMapInner
      operationalLatitude={props.operationalLatitude}
      operationalLongitude={props.operationalLongitude}
      submittedLatitude={props.submittedLatitude}
      submittedLongitude={props.submittedLongitude}
      referenceNumber={props.referenceNumber}
    />
  );
}
