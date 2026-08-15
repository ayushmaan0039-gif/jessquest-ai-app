/**
 * Shared constants + Convex value validators used by both the backend
 * (src/convex/*) and the frontend. Keep this file free of server-only
 * imports so it can be imported from React components.
 */
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Committee frameworks
// ---------------------------------------------------------------------------

export const COMMITTEE_FRAMEWORKS = ["un", "loksabha", "aippm"] as const;
export type CommitteeFramework = (typeof COMMITTEE_FRAMEWORKS)[number];

export const committeeFrameworkValidator = v.union(
  v.literal("un"),
  v.literal("loksabha"),
  v.literal("aippm"),
);

// ---------------------------------------------------------------------------
// Skill levels
// ---------------------------------------------------------------------------

export const SKILL_LEVELS = ["beginner", "veteran"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const skillLevelValidator = v.union(
  v.literal("beginner"),
  v.literal("veteran"),
);

// ---------------------------------------------------------------------------
// Dashboard tabs (persisted so the workspace remembers where you left off)
// ---------------------------------------------------------------------------

export const ACTIVE_TABS = ["interventions", "poiVault", "resolutions"] as const;
export type ActiveTab = (typeof ACTIVE_TABS)[number];

export const activeTabValidator = v.union(
  v.literal("interventions"),
  v.literal("poiVault"),
  v.literal("resolutions"),
);

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export const INTERVENTION_TYPES = [
  "Formal Speech",
  "Right of Reply",
  "Explanation of Vote",
  "Procedural Motion",
  "Cross-Examination Answer",
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const interventionTypeValidator = v.union(
  v.literal("Formal Speech"),
  v.literal("Right of Reply"),
  v.literal("Explanation of Vote"),
  v.literal("Procedural Motion"),
  v.literal("Cross-Examination Answer"),
);

export const INTERVENTION_STATUSES = ["live", "upcoming", "delivered"] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const interventionStatusValidator = v.union(
  v.literal("live"),
  v.literal("upcoming"),
  v.literal("delivered"),
);

// ---------------------------------------------------------------------------
// POI vault
// ---------------------------------------------------------------------------

export const POI_CATEGORIES = ["poi", "cross_exam"] as const;
export type PoiCategory = (typeof POI_CATEGORIES)[number];

export const poiCategoryValidator = v.union(
  v.literal("poi"),
  v.literal("cross_exam"),
);

// ---------------------------------------------------------------------------
// Resolutions
// ---------------------------------------------------------------------------

export const RESOLUTION_STATUSES = ["draft", "signatures", "submitted"] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

export const resolutionStatusValidator = v.union(
  v.literal("draft"),
  v.literal("signatures"),
  v.literal("submitted"),
);
