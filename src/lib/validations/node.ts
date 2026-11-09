import { z } from "zod";

export const nodeTypeSchema = z.enum([
  "problem",
  "requirement",
  "input",
  "process",
  "ai",
  "database",
  "api",
  "output",
  "validation",
]);

export const nodeStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "decided",
  "needs_review",
]);

export const nodeContentSchema = z.object({
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  process: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  failureCases: z.array(z.string()).optional(),
  validationMethods: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  unresolvedItems: z.array(z.string()).optional(),
});

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// 사용자가 캔버스에서 직접 만드는 노드 (source: manual).
export const createNodeSchema = z.object({
  nodeType: nodeTypeSchema,
  title: z.string().trim().min(1, "노드명을 입력하세요.").max(200),
  description: z.string().trim().max(5000).optional(),
  position: nodePositionSchema,
});

export type CreateNodeInput = z.infer<typeof createNodeSchema>;

export const updateNodeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  content: nodeContentSchema.optional(),
  position: nodePositionSchema.optional(),
  status: nodeStatusSchema.optional(),
});

export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
