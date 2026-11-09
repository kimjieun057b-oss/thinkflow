import { z } from "zod";

export const serviceTypeSchema = z.enum(["web", "ai", "hybrid"]);
export const projectStartTypeSchema = z.enum(["new", "import"]);
export const projectStatusSchema = z.enum(["active", "completed", "archived"]);

// 새 설계 시작: 프로젝트명 + 서비스 설명 + 서비스 유형 (PRD 5.2)
// 기존 설계 가져오기: 설명/유형은 선택 — 파일 분석 후 확정할 수 있으므로 생성 시점에는 선택값으로 둔다.
export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "프로젝트명을 입력하세요.").max(200),
    description: z.string().trim().max(5000).optional(),
    serviceType: serviceTypeSchema.optional(),
    startType: projectStartTypeSchema,
  })
  .refine((data) => data.startType !== "new" || Boolean(data.serviceType), {
    message: "새 설계 시작은 서비스 유형을 선택해야 합니다.",
    path: ["serviceType"],
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  serviceType: serviceTypeSchema.optional(),
  status: projectStatusSchema.optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
