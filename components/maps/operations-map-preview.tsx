"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { OverviewData } from "@/components/dashboard/overview-types";

const OperationsMapPreviewClient = dynamic(
  () => import("@/components/maps/operations-map-preview-client").then((mod) => mod.OperationsMapPreviewClient),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

type OperationsMapPreviewProps = OverviewData["map"];

export function OperationsMapPreview(props: OperationsMapPreviewProps) {
  return (
    <div className="h-72 w-full overflow-hidden rounded-lg lg:h-96" role="img" aria-label="Bariga pilot operations map preview">
      <OperationsMapPreviewClient {...props} />
    </div>
  );
}
