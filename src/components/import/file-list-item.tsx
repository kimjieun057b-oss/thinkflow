import { FileTextIcon, Loader2Icon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { UploadItem } from "@/components/import/import-shell";
import { FILE_STATUS_BADGE_VARIANT, FILE_STATUS_LABEL, formatFileSize } from "@/constants/file";

export function FileListItem({
  item,
  onDelete,
}: {
  item: UploadItem;
  onDelete: (item: UploadItem) => void;
}) {
  const canDelete = item.phase === "done" || item.phase === "error";

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 text-sm font-medium">{item.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatFileSize(item.size)}
          </span>
        </div>

        {item.phase === "uploading" && (
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={item.progress} className="flex-1" />
            <span className="w-9 shrink-0 text-xs text-muted-foreground">{item.progress}%</span>
          </div>
        )}

        {item.phase === "processing" && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" /> 서버에서 파일을 분석하는 중...
          </p>
        )}

        {item.phase === "error" && (
          <p className="mt-1 text-xs text-destructive">{item.errorMessage}</p>
        )}

        {item.phase === "done" && item.file && (
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={FILE_STATUS_BADGE_VARIANT[item.file.status]}>
              {FILE_STATUS_LABEL[item.file.status]}
            </Badge>
            {item.file.status === "failed" && item.extraction?.error_message && (
              <span className="line-clamp-1 text-xs text-destructive">
                {item.extraction.error_message}
              </span>
            )}
          </div>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label="파일 삭제"
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
        </button>
      )}
    </div>
  );
}
