import * as z from "zod";

const timingPropertiesMetaSchema = z.object({
  startTime: z.number(), // Main process start time - Time since midnight January 1, 1970 GMT
  startTimeAsClockMonotonicNanosecondsSinceBoot: z.number().optional(),
  startTimeAsMachAbsoluteTimeNanoseconds: z.number().optional(),
  startTimeAsQueryPerformanceCounterValue: z.number().optional(),
  profilingStartTime: z.number(),
  contentEarliestTime: z.number(),
  profilingEndTime: z.number(),
  shutdownTime: z.number().nullable(),
  interval: z.number(),
});

const updateChannels = z.enum([
  "default",
  "nightly",
  "nightly-try",
  "aurora",
  "beta",
  "release",
  "esr",
]);

export const processMetaSchema = z.intersection(
  timingPropertiesMetaSchema,
  z.object({
    // Missing: categories, markerSchema
    version: z.number(),
    configuration: z.object({
      features: z.array(z.string()),
      threads: z.array(z.string()),
      interval: z.number(), // In milliseconds
      capacity: z.number(), // In bytes
      activeTabID: z.number(),
    }),
    stackwalk: z.coerce.boolean(), // 0: False, 1: True
    debug: z.coerce.boolean(), // 0: False, 1: True
    gcpoison: z.coerce.boolean(), // 0: False, 1: True
    asyncstack: z.coerce.boolean(), // 0: False, 1: True
    processType: z.number(),
    updateChannel: updateChannels,
    sampleUnits: z.object({
      time: z.string(),
      eventDelay: z.string(),
      threadCPUDelta: z.string(),
    }),
  }),
);

export const fullMetaSchema = z.intersection(
  processMetaSchema,
  z.object({
    // Platform information
    platform: z.string().optional(),
    oscpu: z.string().optional(),
    misc: z.string().optional(),
    // Runtime information
    abi: z.string().optional(),
    toolkit: z.string().optional(),
    product: z.string().optional(),
    // App information
    appBuildID: z.string().optional(),
    sourceURL: z.string().optional(),
    // System info
    physicalCPUs: z.number().optional(),
    logicalCPUs: z.number().optional(),
    CPUName: z.string().optional(),
    // Extensions
    extensions: z.object({
      schema: z.record(z.string(), z.number()),
      data: z.array(z.array(z.string())),
    }),
    device: z.string().optional(), // Android only property
  }),
);
