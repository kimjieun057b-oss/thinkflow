import { z } from "zod";

export const edgeTypeSchema = z.enum(["data", "control", "dependency"]);

export const createConnectionSchema = z.object({
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  edgeType: edgeTypeSchema.optional(),
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;

export const updateConnectionSchema = z.object({
  edgeType: edgeTypeSchema,
});

export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
