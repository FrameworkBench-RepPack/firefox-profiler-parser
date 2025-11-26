import * as z from "zod";
import { markerSchema } from "./markerSchemas.ts";

const threadSchema = z.object({
  // Missing: tracedObjectShapes, tracedValues
  name: z.string(),
  processType: z.string(),
  processName: z.string().optional(),
  "eTLD+1": z.string().optional(),
  isPrivateBrowsing: z.boolean().optional(),
  userContextId: z.number().optional(),
  registerTime: z.number(),
  unregisterTime: z.number().nullable(),
  pid: z.number(),
  tid: z.number(),
  markers: z.object({
    schema: z.record(z.string(), z.number()),
    data: z.array(markerSchema),
  }),
  samples: z.object({
    schema: z.record(z.string(), z.number()),
    data: z.array(z.array(z.number())),
  }),
  stackTable: z.object({
    schema: z.record(z.string(), z.number()),
    data: z.array(z.array(z.number().nullable())),
  }),
  frameTable: z.object({
    schema: z.record(z.string(), z.number()),
    data: z.array(z.array(z.union([z.number(), z.boolean()]).nullable())),
  }),
  stringTable: z.array(z.string()),
});
export type Thread = z.infer<typeof threadSchema>;

export const threadListSchema = z.array(threadSchema);
