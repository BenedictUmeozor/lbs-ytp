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
import type * as dashboard from "../dashboard.js";
import type * as domain_demo_data from "../domain/demo_data.js";
import type * as domain_read_helpers from "../domain/read_helpers.js";
import type * as domain_status_rules from "../domain/status_rules.js";
import type * as domain_validators from "../domain/validators.js";
import type * as domain_write_helpers from "../domain/write_helpers.js";
import type * as maintenance from "../maintenance.js";
import type * as notifications from "../notifications.js";
import type * as reports from "../reports.js";
import type * as routes from "../routes.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as trucks from "../trucks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  bins: typeof bins;
  dashboard: typeof dashboard;
  "domain/demo_data": typeof domain_demo_data;
  "domain/read_helpers": typeof domain_read_helpers;
  "domain/status_rules": typeof domain_status_rules;
  "domain/validators": typeof domain_validators;
  "domain/write_helpers": typeof domain_write_helpers;
  maintenance: typeof maintenance;
  notifications: typeof notifications;
  reports: typeof reports;
  routes: typeof routes;
  seed: typeof seed;
  settings: typeof settings;
  tasks: typeof tasks;
  trucks: typeof trucks;
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
