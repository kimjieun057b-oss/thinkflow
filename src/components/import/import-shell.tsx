"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AnalysisResultView } from "@/components/import/analysis-result-view";
import { FileDropzone } from "@/components/import/file-dropzone";
import { FileListItem } from "@/components/import/file-list-item";
import { validateUploadedFile } from "@/lib/validations/file";
import { uploadFileWithProgress } from "@/lib/upload-file";
import type {
  DesignAnalysisRunRow,
  DesignFileRow,
  FileExtractionRow,
  ImportedDesignAnalysis,
  ProjectRow,
} from "@/types/database";

export interface UploadItem {
  clientId: string;
  name: string;
  size: number;
  progress: number;
  phase: "uploading" | "processing" | "done" | "error";
  errorMessage?: string;
  file?: DesignFileRow;
  extraction?: FileExtractionRow;
}

function fileRowToItem(file: DesignFileRow): UploadItem {
  return {
    clientId: file.id,
    name: file.file_name,
    size: file.file_size,
    progress: 100,
    phase: "done",
    file,
  };
}

export function ImportShell({
  project,
  initialFiles,
}: {
  project: ProjectRow;
  initialFiles: DesignFileRow[];
}) {
  const [items, setItems] = useState<UploadItem[]>(() => initialFiles.map(fileRowToItem));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImportedDesignAnalysis | null>(null);

  const updateItem = useCallback((clientId: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)),
    );
  }, []);

  const uploadOne = useCallback(
    async (file: File) => {
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setItems((prev) => [
        ...prev,
        { clientId, name: file.name, size: file.size, progress: 0, phase: "uploading" },
      ]);

      try {
        const res = await uploadFileWithProgress<{
          file: DesignFileRow;
          extraction: FileExtractionRow;
          error?: string;
        }>(`/api/projects/${project.id}/files`, file, (percent) => {
          updateItem(clientId, { progress: percent, phase: percent < 100 ? "uploading" : "processing" });
        });

        if (res.status >= 200 && res.status < 300 && res.body && "file" in res.body) {
          updateItem(clientId, {
            phase: "done",
            progress: 100,
            file: res.body.file,
            extraction: res.body.extraction,
          });
        } else {
          const message =
            (res.body && "error" in res.body && typeof res.body.error === "string"
              ? res.body.error
              : null) ?? "업로드에 실패했습니다.";
          updateItem(clientId, { phase: "error", errorMessage: message });
        }
      } catch {
        updateItem(clientId, { phase: "error", errorMessage: "네트워크 오류가 발생했습니다." });
      }
    },
    [project.id, updateItem],
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const validationError = validateUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
        });
        if (validationError) {
          const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setItems((prev) => [
            ...prev,
            {
              clientId,
              name: file.name,
              size: file.size,
              progress: 0,
              phase: "error",
              errorMessage: validationError.message,
            },
          ]);
          continue;
        }
        void uploadOne(file);
      }
    },
    [uploadOne],
  );

  const handleDelete = useCallback(async (item: UploadItem) => {
    if (item.phase === "error" || !item.file) {
      setItems((prev) => prev.filter((i) => i.clientId !== item.clientId));
      return;
    }
    try {
      const res = await fetch(`/api/files/${item.file.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.clientId !== item.clientId));
    } catch {
      toast.error("파일 삭제에 실패했습니다.");
    }
  }, []);

  const hasAnalyzableFile = items.some(
    (item) => item.phase === "done" && item.file?.status === "extracted",
  );

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/import-analysis`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(typeof body?.error === "string" ? body.error : "분석에 실패했습니다.");
        return;
      }
      const run = body.analysisRun as DesignAnalysisRunRow;
      setAnalysisResult(run.result);
      toast.success("통합 분석이 완료되었습니다.");
    } catch {
      toast.error("분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [project.id]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button render={<Link href="/dashboard" />} variant="ghost" size="sm" className="w-fit">
          <ArrowLeftIcon />
          대시보드
        </Button>
        <div>
          <h1 className="text-xl font-medium">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            기존 PRD, DB 스키마, API 명세 등 설계 파일을 업로드하면 파일별로 내용을 추출하고
            통합 분석합니다.
          </p>
        </div>
      </div>

      <FileDropzone onFilesSelected={handleFilesSelected} />

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <FileListItem key={item.clientId} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          추출이 완료된 파일만 통합 분석에 사용됩니다. 실패한 파일은 삭제 후 다시 업로드하세요.
        </p>
        <Button onClick={handleAnalyze} disabled={!hasAnalyzableFile || isAnalyzing}>
          <SearchIcon />
          {isAnalyzing ? "분석 중..." : "분석 시작"}
        </Button>
      </div>

      {analysisResult && <AnalysisResultView result={analysisResult} />}
    </div>
  );
}
