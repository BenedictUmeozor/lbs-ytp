import type {
  AiStatus,
  BinStatus,
  DataSource,
  DeviceStatus,
  MaintenanceRisk,
  NotificationSeverity,
  NotificationType,
  Priority,
  ReportCategory,
  ReportSource,
  ReportStatus,
  TaskSourceType,
  TaskStatus,
  TruckStatus,
} from "./validators";

export const globalSettings = {
  key: "global",
  approachingFullThreshold: 60,
  collectionRequiredThreshold: 80,
  criticalThreshold: 95,
  emptyConfirmationThreshold: 30,
  deviceOfflineTimeoutMinutes: 5,
  duplicateDistanceThresholdMeters: 100,
  maximumRouteStops: 8,
  depotLatitude: 6.5385,
  depotLongitude: 3.3868,
  simulationStepIntervalSeconds: 5,
  hardwareDemoIntervalSeconds: 30,
  trafficPenaltyMinutes: 8,
  roadConditionPenaltyMinutes: 5,
} as const;

type DemoBin = {
  displayId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  currentFillPercentage: number;
  status: BinStatus;
  source: DataSource;
  awaitingEmptyConfirmation: boolean;
  readings: readonly [number, number, number];
};

export const demoBins: readonly DemoBin[] = [
  {
    displayId: "BG-001",
    name: "Bariga Market Smart Bin",
    address: "Bariga Market, Jagunmolu Street, Bariga",
    latitude: 6.5368,
    longitude: 3.3869,
    currentFillPercentage: 45,
    status: "normal",
    source: "real",
    awaitingEmptyConfirmation: false,
    readings: [35, 40, 45],
  },
  {
    displayId: "BG-002",
    name: "Pedro Bus Stop Bin",
    address: "Pedro Bus Stop, Bariga",
    latitude: 6.5354,
    longitude: 3.3912,
    currentFillPercentage: 88,
    status: "collection_required",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [70, 80, 88],
  },
  {
    displayId: "BG-003",
    name: "Ilaje Road Junction Bin",
    address: "Ilaje Road Junction, Bariga",
    latitude: 6.5421,
    longitude: 3.39,
    currentFillPercentage: 97,
    status: "critical",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [82, 91, 97],
  },
  {
    displayId: "BG-004",
    name: "Bawala Street Bin",
    address: "Bawala Street, Bariga",
    latitude: 6.5389,
    longitude: 3.3944,
    currentFillPercentage: 72,
    status: "approaching_full",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [55, 64, 72],
  },
  {
    displayId: "BG-005",
    name: "CMS Grammar School Bin",
    address: "CMS Grammar School Area, Bariga",
    latitude: 6.5319,
    longitude: 3.3882,
    currentFillPercentage: 35,
    status: "normal",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [28, 31, 35],
  },
  {
    displayId: "BG-006",
    name: "Shomolu-Bariga Road Bin",
    address: "Shomolu-Bariga Road, Bariga",
    latitude: 6.544,
    longitude: 3.3854,
    currentFillPercentage: 76,
    status: "approaching_full",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [60, 68, 76],
  },
  {
    displayId: "BG-007",
    name: "Akoka Road Junction Bin",
    address: "Akoka Road Junction, Bariga",
    latitude: 6.5298,
    longitude: 3.3925,
    currentFillPercentage: 58,
    status: "normal",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [46, 52, 58],
  },
  {
    displayId: "BG-008",
    name: "Odunsi Street Bin",
    address: "Odunsi Street, Bariga",
    latitude: 6.5412,
    longitude: 3.3971,
    currentFillPercentage: 64,
    status: "approaching_full",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [48, 57, 64],
  },
  {
    displayId: "BG-009",
    name: "Aiyetoro Street Bin",
    address: "Aiyetoro Street, Bariga",
    latitude: 6.5341,
    longitude: 3.3835,
    currentFillPercentage: 20,
    status: "normal",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [14, 17, 20],
  },
  {
    displayId: "BG-010",
    name: "Abule Okuta Junction Bin",
    address: "Abule Okuta Junction, Bariga",
    latitude: 6.5462,
    longitude: 3.3928,
    currentFillPercentage: 52,
    status: "normal",
    source: "simulated",
    awaitingEmptyConfirmation: false,
    readings: [38, 45, 52],
  },
];

type DemoDevice = {
  deviceIdentifier: string;
  binDisplayId: string;
  source: DataSource;
  status: DeviceStatus;
};

export const demoDevices: readonly DemoDevice[] = demoBins.map(
  (bin, index) => ({
    deviceIdentifier: `device-${String(index + 1).padStart(3, "0")}`,
    binDisplayId: bin.displayId,
    source: bin.source,
    status: "online",
  }),
);

type DemoTruck = {
  displayId: string;
  driverName: string;
  status: TruckStatus;
  latitude: number;
  longitude: number;
  capacityPercentage: number;
  maintenanceRisk: MaintenanceRisk;
  mileageSinceService: number;
  lastServiceDaysAgo: number;
  batteryPercentage: number;
  engineHealthScore: number;
  reportedFault?: string;
  nextRecommendedServiceDaysFromNow: number;
};

export const demoTrucks: readonly DemoTruck[] = [
  {
    displayId: "TRK-01",
    driverName: "Musa Ibrahim",
    status: "available",
    latitude: globalSettings.depotLatitude,
    longitude: globalSettings.depotLongitude,
    capacityPercentage: 20,
    maintenanceRisk: "normal",
    mileageSinceService: 820,
    lastServiceDaysAgo: 20,
    batteryPercentage: 92,
    engineHealthScore: 94,
    nextRecommendedServiceDaysFromNow: 40,
  },
  {
    displayId: "TRK-02",
    driverName: "Chinedu Okafor",
    status: "available",
    latitude: 6.5375,
    longitude: 3.389,
    capacityPercentage: 15,
    maintenanceRisk: "medium",
    mileageSinceService: 4650,
    lastServiceDaysAgo: 82,
    batteryPercentage: 76,
    engineHealthScore: 72,
    reportedFault: "Approaching service interval",
    nextRecommendedServiceDaysFromNow: 5,
  },
  {
    displayId: "TRK-03",
    driverName: "Tunde Balogun",
    status: "maintenance",
    latitude: globalSettings.depotLatitude,
    longitude: globalSettings.depotLongitude,
    capacityPercentage: 0,
    maintenanceRisk: "high",
    mileageSinceService: 7900,
    lastServiceDaysAgo: 145,
    batteryPercentage: 41,
    engineHealthScore: 48,
    reportedFault: "Simulated battery anomaly and overdue service",
    nextRecommendedServiceDaysFromNow: 0,
  },
];

type DemoReport = {
  referenceNumber: string;
  source: ReportSource;
  originalMessage: string;
  category: ReportCategory;
  priority: Priority;
  summary: string;
  landmarkText: string;
  latitude?: number;
  longitude?: number;
  submittedCoordinates?: boolean;
  requiresCollection: boolean;
  needsClarification: boolean;
  aiStatus: AiStatus;
  status: ReportStatus;
  statusUpdatedMinutesAgo: number;
  resolvedMinutesAgo?: number;
};

export const demoReports: readonly DemoReport[] = [
  {
    referenceNumber: "WR-1001",
    source: "web",
    originalMessage:
      "Waste is overflowing beside Bariga Market and blocking part of the road.",
    category: "overflowing_waste",
    priority: "high",
    summary:
      "Overflowing waste is partially obstructing the road beside Bariga Market.",
    landmarkText: "Bariga Market",
    latitude: 6.5369,
    longitude: 3.3872,
    submittedCoordinates: true,
    requiresCollection: true,
    needsClarification: false,
    aiStatus: "completed",
    status: "task_created",
    statusUpdatedMinutesAgo: 20,
  },
  {
    referenceNumber: "WR-1002",
    source: "whatsapp",
    originalMessage:
      "The drainage at Ilaje Road is blocked with refuse and water is no longer passing.",
    category: "drainage_blockage",
    priority: "critical",
    summary:
      "Waste is blocking drainage flow at Ilaje Road and presents a flooding risk.",
    landmarkText: "Ilaje Road Junction",
    latitude: 6.5327,
    longitude: 3.3906,
    requiresCollection: true,
    needsClarification: false,
    aiStatus: "completed",
    status: "task_created",
    statusUpdatedMinutesAgo: 15,
  },
  {
    referenceNumber: "WR-1003",
    source: "web",
    originalMessage:
      "Our scheduled collection did not happen near Pedro Bus Stop.",
    category: "missed_collection",
    priority: "medium",
    summary:
      "A scheduled collection was reportedly missed near Pedro Bus Stop.",
    landmarkText: "Pedro Bus Stop",
    latitude: 6.536,
    longitude: 3.394,
    submittedCoordinates: true,
    requiresCollection: false,
    needsClarification: false,
    aiStatus: "completed",
    status: "under_review",
    statusUpdatedMinutesAgo: 30,
  },
  {
    referenceNumber: "WR-1004",
    source: "whatsapp",
    originalMessage:
      "People have started dumping refuse on an open space near Abule Okuta.",
    category: "illegal_dumpsite",
    priority: "medium",
    summary:
      "A possible illegal dumpsite requires investigation near Abule Okuta.",
    landmarkText: "Abule Okuta Junction",
    latitude: 6.545,
    longitude: 3.387,
    requiresCollection: false,
    needsClarification: false,
    aiStatus: "completed",
    status: "under_review",
    statusUpdatedMinutesAgo: 25,
  },
  {
    referenceNumber: "WR-1005",
    source: "web",
    originalMessage: "There is a waste problem around my area in Bariga.",
    category: "other",
    priority: "low",
    summary: "The submitted location is too vague for operational action.",
    landmarkText: "Around Bariga",
    requiresCollection: false,
    needsClarification: true,
    aiStatus: "completed",
    status: "needs_clarification",
    statusUpdatedMinutesAgo: 10,
  },
  {
    referenceNumber: "WR-1006",
    source: "whatsapp",
    originalMessage:
      "An overflowing waste point near CMS Grammar School needs collection.",
    category: "overflowing_waste",
    priority: "high",
    summary: "Overflowing waste near CMS Grammar School required collection.",
    landmarkText: "CMS Grammar School",
    latitude: 6.5386,
    longitude: 3.3962,
    requiresCollection: true,
    needsClarification: false,
    aiStatus: "completed",
    status: "resolved",
    statusUpdatedMinutesAgo: 120,
    resolvedMinutesAgo: 120,
  },
];

type DemoTask = {
  displayId: string;
  sourceType: TaskSourceType;
  sourceBinDisplayId?: string;
  sourceReportReference?: string;
  linkedReportReferences: readonly string[];
  latitude: number;
  longitude: number;
  priority: Priority;
  reason: string;
  status: TaskStatus;
  assignedTruckDisplayId?: string;
  statusUpdatedMinutesAgo: number;
  completedMinutesAgo?: number;
};

export const demoTasks: readonly DemoTask[] = [
  {
    displayId: "CT-001",
    sourceType: "smart_bin",
    sourceBinDisplayId: "BG-003",
    linkedReportReferences: [],
    latitude: 6.5421,
    longitude: 3.39,
    priority: "critical",
    reason: "Smart bin reached the critical fill threshold.",
    status: "pending",
    statusUpdatedMinutesAgo: 1,
  },
  {
    displayId: "CT-002",
    sourceType: "smart_bin",
    sourceBinDisplayId: "BG-002",
    linkedReportReferences: [],
    latitude: 6.5354,
    longitude: 3.3912,
    priority: "high",
    reason: "Smart bin reached the collection-required threshold.",
    status: "pending",
    statusUpdatedMinutesAgo: 1,
  },
  {
    displayId: "CT-003",
    sourceType: "citizen_report",
    sourceReportReference: "WR-1002",
    linkedReportReferences: ["WR-1002"],
    latitude: 6.5327,
    longitude: 3.3906,
    priority: "critical",
    reason: "Critical drainage blockage requires waste removal.",
    status: "pending",
    statusUpdatedMinutesAgo: 15,
  },
  {
    displayId: "CT-004",
    sourceType: "citizen_report",
    sourceReportReference: "WR-1001",
    linkedReportReferences: ["WR-1001"],
    latitude: 6.5369,
    longitude: 3.3872,
    priority: "high",
    reason: "Overflowing waste is obstructing part of the road.",
    status: "pending",
    statusUpdatedMinutesAgo: 20,
  },
  {
    displayId: "CT-005",
    sourceType: "citizen_report",
    sourceReportReference: "WR-1006",
    linkedReportReferences: ["WR-1006"],
    latitude: 6.5386,
    longitude: 3.3962,
    priority: "high",
    reason: "Overflowing waste near CMS Grammar School was collected.",
    status: "collected",
    assignedTruckDisplayId: "TRK-01",
    statusUpdatedMinutesAgo: 120,
    completedMinutesAgo: 120,
  },
];

export const demoMaintenanceAlerts = [
  {
    truckDisplayId: "TRK-02",
    risk: "medium" as MaintenanceRisk,
    reason: "Approaching service interval",
    recommendation: "Inspect after current operations",
    simulated: true,
  },
  {
    truckDisplayId: "TRK-03",
    risk: "high" as MaintenanceRisk,
    reason: "Simulated battery anomaly and overdue service",
    recommendation: "Keep unavailable and schedule inspection",
    simulated: true,
  },
] as const;

export const demoNotifications: readonly {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  description: string;
  relatedEntityType: "bin" | "citizen_report" | "truck";
  relatedEntityKey: string;
}[] = [
  {
    type: "bin_critical",
    severity: "critical",
    title: "BG-003 is critical",
    description: "Ilaje Road Junction Bin reached 97% fill.",
    relatedEntityType: "bin",
    relatedEntityKey: "BG-003",
  },
  {
    type: "bin_collection_required",
    severity: "warning",
    title: "BG-002 requires collection",
    description: "Pedro Bus Stop Bin reached 88% fill.",
    relatedEntityType: "bin",
    relatedEntityKey: "BG-002",
  },
  {
    type: "critical_report",
    severity: "critical",
    title: "Critical citizen report WR-1002",
    description: "A drainage blockage requires urgent attention.",
    relatedEntityType: "citizen_report",
    relatedEntityKey: "WR-1002",
  },
  {
    type: "high_priority_report",
    severity: "warning",
    title: "High-priority citizen report WR-1001",
    description: "Overflowing waste is obstructing part of the road.",
    relatedEntityType: "citizen_report",
    relatedEntityKey: "WR-1001",
  },
  {
    type: "maintenance_high_risk",
    severity: "critical",
    title: "TRK-03 has high maintenance risk",
    description: "Keep the simulated truck unavailable pending inspection.",
    relatedEntityType: "truck",
    relatedEntityKey: "TRK-03",
  },
];
