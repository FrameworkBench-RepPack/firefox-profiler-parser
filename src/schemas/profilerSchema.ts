import * as z from "zod";
import { processMetaSchema, fullMetaSchema } from "./metadataSchemas.ts";
import { threadListSchema } from "./threadSchemas.ts";

const pageSchema = z.object({
  tabID: z.number(),
  innerWindowID: z.number(),
  url: z.string(),
  embedderInnerWindowID: z.number(),
  isPrivateBrowsing: z.boolean(),
  favicon: z.string().optional(),
});

const pageListSchema = z.array(pageSchema);

const countersSchema = z.object({
  name: z.string(),
  category: z.string(),
  description: z.string(),
  samples: z.object({
    schema: z.record(z.string(), z.number()),
    data: z.array(z.array(z.number())),
  }),
});

export type Counter = z.infer<typeof countersSchema>;

const countersListSchema = z.array(countersSchema);

export const profileProcessSchema = z.array(
  z.object({
    // Missing: libs, processes
    meta: processMetaSchema,
    pages: pageListSchema,
    counters: countersListSchema,
    threads: threadListSchema,
    pausedRanges: z.array(
      z.object({
        startTime: z.number(),
        endTime: z.number().nullable(),
        reason: z.string(),
      })
    ),
    profilingLog: z.record(
      z.string(),
      z.object({
        profilingLogBegin_TSms: z.number(),
        profilingLogEnd_TSms: z.number(),
      })
    ),
  })
);

/** Optional logs that older versions of firefox does not support
 * [log: string]: unknown
 */
const profilingLogSchema = z.record(z.string(), z.unknown());

/**
 * A schema representing the profiler data that we are interested in analyzing
 * Some unused parts of the schema have been commented out for optimization purposes
 */
export const profilerSchema = z.object({
  meta: fullMetaSchema,
  processes: profileProcessSchema,
  // pages: pageListSchema,
  // counters: countersListSchema,
  // threads: threadListSchema,

  /** [pid]: ProfilingLog */
  // profilingLog: z.record(z.coerce.number(), profilingLogSchema),

  /** [pid]: ProfilingLog */
  // profileGatheringLog: z.record(z.coerce.number(), profilingLogSchema),
});
