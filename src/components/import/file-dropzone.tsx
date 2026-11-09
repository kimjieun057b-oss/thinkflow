"use client";

import { useRef, useState } from "react";
import { UploadCloudIcon } from "lucide-react";

import { ALLOWED_FILE_EXTENSIONS } from "@/constants/file";
import { cn } from "cn";

export function FileDropzone({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        isDragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
      )}
    >
      <UploadCloudIcon className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">파일을 드래그하거나 클릭해서 업로드하세요</p>
      <p className="text-xs text-muted-foreground">
        {ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(", ")} 지원 · 여러 파일 동시 업로드 가능
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
