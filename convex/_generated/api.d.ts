/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as bins from "../bins.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as domain_auth from "../domain/auth.js";
import type * as domain_bin_rules from "../domain/bin_rules.js";
import type * as domain_demo_data from "../domain/demo_data.js";
import type * as domain_location_rules from "../domain/location_rules.js";
import type * as domain_maintenance from "../domain/maintenance.js";
import type * as domain_operations from "../domain/operations.js";
import type * as domain_read_helpers from "../domain/read_helpers.js";
import type * as domain_report_management_rules from "../domain/report_management_rules.js";
import type * as domain_report_rules from "../domain/report_rules.js";
import type * as domain_report_task_evaluation from "../domain/report_task_evaluation.js";
import type * as domain_report_triage from "../domain/report_triage.js";
import type * as domain_route_algorithm from "../domain/route_algorithm.js";
import type * as domain_route_reoptimisation from "../domain/route_reoptimisation.js";
import type * as domain_route_reoptimisation_notifications from "../domain/route_reoptimisation_notifications.js";
import type * as domain_route_rules from "../domain/route_rules.js";
import type * as domain_route_task_helpers from "../domain/route_task_helpers.js";
import type * as domain_status_rules from "../domain/status_rules.js";
import type * as domain_task_helpers from "../domain/task_helpers.js";
import type * as domain_task_rules from "../domain/task_rules.js";
import type * as domain_truck_simulation from "../domain/truck_simulation.js";
import type * as domain_validators from "../domain/validators.js";
import type * as domain_write_helpers from "../domain/write_helpers.js";
import type * as fleetManagement from "../fleetManagement.js";
import type * as hardware from "../hardware.js";
import type * as http from "../http.js";
import type * as maintenance from "../maintenance.js";
import type * as maintenanceManagement from "../maintenanceManagement.js";
import type * as notifications from "../notifications.js";
import type * as operationsMap from "../operationsMap.js";
import type * as reportManagement from "../reportManagement.js";
import type * as reportProcessing from "../reportProcessing.js";
import type * as reportProcessingData from "../reportProcessingData.js";
import type * as reports from "../reports.js";
import type * as routeManagement from "../routeManagement.js";
import type * as routes from "../routes.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as taskManagement from "../taskManagement.js";
import type * as tasks from "../tasks.js";
import type * as truckSimulation from "../truckSimulation.js";
import type * as trucks from "../trucks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  bins: typeof bins;
  crons: typeof crons;
  dashboard: typeof dashboard;
  "domain/auth": typeof domain_auth;
  "domain/bin_rules": typeof domain_bin_rules;
  "domain/demo_data": typeof domain_demo_data;
  "domain/location_rules": typeof domain_location_rules;
  "domain/maintenance": typeof domain_maintenance;
  "domain/operations": typeof domain_operations;
  "domain/read_helpers": typeof domain_read_helpers;
  "domain/report_management_rules": typeof domain_report_management_rules;
  "domain/report_rules": typeof domain_report_rules;
  "domain/report_task_evaluation": typeof domain_report_task_evaluation;
  "domain/report_triage": typeof domain_report_triage;
  "domain/route_algorithm": typeof domain_route_algorithm;
  "domain/route_reoptimisation": typeof domain_route_reoptimisation;
  "domain/route_reoptimisation_notifications": typeof domain_route_reoptimisation_notifications;
  "domain/route_rules": typeof domain_route_rules;
  "domain/route_task_helpers": typeof domain_route_task_helpers;
  "domain/status_rules": typeof domain_status_rules;
  "domain/task_helpers": typeof domain_task_helpers;
  "domain/task_rules": typeof domain_task_rules;
  "domain/truck_simulation": typeof domain_truck_simulation;
  "domain/validators": typeof domain_validators;
  "domain/write_helpers": typeof domain_write_helpers;
  fleetManagement: typeof fleetManagement;
  hardware: typeof hardware;
  http: typeof http;
  maintenance: typeof maintenance;
  maintenanceManagement: typeof maintenanceManagement;
  notifications: typeof notifications;
  operationsMap: typeof operationsMap;
  reportManagement: typeof reportManagement;
  reportProcessing: typeof reportProcessing;
  reportProcessingData: typeof reportProcessingData;
  reports: typeof reports;
  routeManagement: typeof routeManagement;
  routes: typeof routes;
  seed: typeof seed;
  settings: typeof settings;
  taskManagement: typeof taskManagement;
  tasks: typeof tasks;
  truckSimulation: typeof truckSimulation;
  trucks: typeof trucks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
