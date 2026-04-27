/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assessmentsAgg from "../assessmentsAgg.js";
import type * as classTracks from "../classTracks.js";
import type * as email from "../email.js";
import type * as emailTest from "../emailTest.js";
import type * as lessonsAgg from "../lessonsAgg.js";
import type * as myFunctions from "../myFunctions.js";
import type * as stats from "../stats.js";
import type * as studentInteractions from "../studentInteractions.js";
import type * as studentLeaderboards from "../studentLeaderboards.js";
import type * as subjectsQuota from "../subjectsQuota.js";
import type * as teacherLeaderboards from "../teacherLeaderboards.js";
import type * as terms from "../terms.js";
import type * as uploads from "../uploads.js";
import type * as userActivity from "../userActivity.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assessmentsAgg: typeof assessmentsAgg;
  classTracks: typeof classTracks;
  email: typeof email;
  emailTest: typeof emailTest;
  lessonsAgg: typeof lessonsAgg;
  myFunctions: typeof myFunctions;
  stats: typeof stats;
  studentInteractions: typeof studentInteractions;
  studentLeaderboards: typeof studentLeaderboards;
  subjectsQuota: typeof subjectsQuota;
  teacherLeaderboards: typeof teacherLeaderboards;
  terms: typeof terms;
  uploads: typeof uploads;
  userActivity: typeof userActivity;
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
