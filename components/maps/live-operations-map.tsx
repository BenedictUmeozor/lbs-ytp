"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { OperationsMapData, SelectedEntity } from "./operations-map-types";

const LiveOperationsMapClient = dynamic(
  () =>
    import("./live-operations-map-client").then(
      (module) => module.LiveOperationsMapClient,
    ),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[32rem] w-full lg:h-[calc(100vh-22rem)] lg:min-h-[32rem]" />
    ),
  },
);

export function LiveOperationsMap(props: {
  data: OperationsMapData;
  visible: {
    bins: OperationsMapData["bins"];
    reports: OperationsMapData["reports"];
    trucks: OperationsMapData["trucks"];
    routeStops: NonNullable<OperationsMapData["activeRoute"]>["stops"];
    depot: boolean;
    route: boolean;
  };
  selected: SelectedEntity | null;
  focusRequest: { coordinates: [number, number]; key: string } | null;
  viewKey: string;
  onSelect: (selection: SelectedEntity) => void;
}) {
  return (
    <div className="h-[32rem] overflow-hidden rounded-xl border lg:h-[calc(100vh-22rem)] lg:min-h-[32rem]">
      <LiveOperationsMapClient {...props} />
    </div>
  );
}
