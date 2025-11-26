import * as z from "zod";

const networkStatusSchema = z.enum([
  "STATUS_START",
  "STATUS_STOP",
  "STATUS_REDIRECT",
  "STATUS_CANCEL",
]);

const networkRedirectTypeSchema = z.enum([
  "Permanent",
  "Temporary",
  "Internal",
]);

const networkHttpVersionSchema = z.enum(["h3", "h2", "http/1.1", "http/1.0"]);

// Reference: https://github.com/firefox-devtools/profiler/blob/main/src/types/markers.ts
const networkPayloadSchema = z.object({
  type: z.literal("Network"),
  innerWindowID: z.number().optional(),
  URI: z.string(),
  RedirectURI: z.string().optional(),
  id: z.number(),
  pri: z.number(), // Priority of load
  count: z.number().optional(), // Total transfer size
  status: networkStatusSchema,

  // Redirect information
  redirectId: z.number().optional(),
  redirectType: networkRedirectTypeSchema.optional(),
  isHttpToHttpsRedirect: z.boolean().optional(),
  cache: z.string().optional(),

  // Content-type HTTP header
  contentType: z.string().optional(),

  isPrivateBrowsing: z.boolean().optional(),
  httpVersion: networkHttpVersionSchema.optional(),

  // Status codes
  requestStatus: z.string().optional(),
  responseStatus: z.string().optional(),

  // Timing information
  startTime: z.number(),
  endTime: z.number(),
  fetchStart: z.number().optional(),
  domainLookupStart: z.number().optional(),
  domainLookupEnd: z.number().optional(),
  connectStart: z.number().optional(),
  tcpConnectEnd: z.number().optional(),
  secureConnectionStart: z.number().optional(),
  connectEnd: z.number().optional(),
  requestStart: z.number().optional(),
  responseStart: z.number().optional(),
  responseEnd: z.number().optional(),
});

export type NetworkPayload = z.infer<typeof networkPayloadSchema>;

export function isNetworkPayload(
  candidate: unknown,
): candidate is NetworkPayload {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "type" in candidate &&
    candidate.type === "Network" &&
    "URI" in candidate &&
    typeof candidate.URI === "string"
  );
}

const MarkerPhaseEnum = {
  Instant: 0,
  Interval: 1,
  IntervalStart: 2,
  IntervalEnd: 3,
} as const;

export type PowerAmountUnit =
  (typeof MarkerPhaseEnum)[keyof typeof MarkerPhaseEnum];

const markerPayloadSchema = z.union([networkPayloadSchema, z.unknown()]);

const markerSchemaNoPayload = z.tuple([
  z.number(),
  z.number().nullable(),
  z.number().nullable(),
  z.nativeEnum(MarkerPhaseEnum),
  z.number(),
]);

const markerSchemaWithPayload = z.tuple([
  z.number(),
  z.number().nullable(),
  z.number().nullable(),
  z.nativeEnum(MarkerPhaseEnum),
  z.number(),
  markerPayloadSchema.nullable().optional(),
]);

export const markerSchema = z.union([
  markerSchemaNoPayload,
  markerSchemaWithPayload,
]);
