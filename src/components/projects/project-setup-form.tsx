"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilePlus2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_TYPE_LABEL } from "@/constants/project";
import type { ProjectStartType, ServiceType } from "@/types/database";
import { cn } from "cn";

const START_TYPE_OPTIONS: {
  value: ProjectStartType;
  title: string;
  description: string;
  icon: typeof SparklesIcon;
}[] = [
  {
    value: "new",
    title: "새 설계 시작",
    description: "서비스 설명을 입력하고 AI의 질문에 답하며 설계를 구체화합니다.",
    icon: SparklesIcon,
  },
  {
    value: "import",
    title: "기존 설계 가져오기",
    description: "기존 PRD, DB 스키마, API 명세 등 파일을 업로드해 분석합니다.",
    icon: FilePlus2Icon,
  },
];

const SERVICE_TYPE_OPTIONS: ServiceType[] = ["web", "ai", "hybrid"];

export function ProjectSetupForm() {
  const router = useRouter();
  const [startType, setStartType] = useState<ProjectStartType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startType) return;
    if (startType === "new" && !serviceType) {
      setError("서비스 유형을 선택하세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        serviceType,
        startType,
      }),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "프로젝트 생성에 실패했습니다.");
      return;
    }

    toast.success("프로젝트를 생성했습니다.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium">새 프로젝트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          설계를 시작할 방식을 선택하세요. 두 방식 모두 동일한 Design Workspace에서 진행됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {START_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = startType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStartType(option.value)}
              aria-pressed={selected}
              className="text-left"
            >
              <Card
                className={cn(
                  "h-full transition-all",
                  selected && "ring-2 ring-primary ring-offset-0",
                )}
              >
                <CardHeader>
                  <Icon className="size-5 text-foreground" />
                  <CardTitle className="mt-1">{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>

      {startType && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 정보</CardTitle>
              <CardDescription>
                {startType === "new"
                  ? "프로젝트명과 서비스 설명, 유형을 입력하세요."
                  : "프로젝트명을 입력하세요. 설명과 유형은 파일 분석 후 확정할 수 있습니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">프로젝트명</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">
                  서비스 설명 {startType === "import" && "(선택)"}
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required={startType === "new"}
                  rows={4}
                  placeholder="만들고 싶은 서비스를 설명하세요."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="serviceType">
                  서비스 유형 {startType === "import" && "(선택 또는 분석 후 확정)"}
                </Label>
                <Select
                  value={serviceType}
                  onValueChange={(value) => setServiceType(value as ServiceType)}
                >
                  <SelectTrigger id="serviceType" className="w-full">
                    <SelectValue placeholder="서비스 유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SERVICE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "생성 중..." : "프로젝트 생성"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
