"use client";

import { useState } from "react";
import type { Node } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { DesignNodeData } from "@/components/workspace/nodes/design-node";
import {
  NODE_CONTENT_FIELDS,
  NODE_STATUS_LABEL,
  NODE_TYPE_ICON,
  NODE_TYPE_LABEL,
} from "@/constants/node";
import type { UpdateNodeInput } from "@/lib/validations/node";
import type { DesignNodeContent, NodeStatus } from "@/types/database";

const NODE_STATUSES: NodeStatus[] = ["not_started", "in_progress", "decided", "needs_review"];

function contentFieldToText(value?: string[]) {
  return (value ?? []).join("\n");
}

function textToContentField(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

export function NodeDetailPanel({
  node,
  onUpdate,
  onDelete,
}: {
  node: Node | null;
  onUpdate: (nodeId: string, input: UpdateNodeInput) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
}) {
  if (!node) {
    return (
      <aside className="flex w-[360px] shrink-0 flex-col items-center justify-center border-l p-6 text-center">
        <p className="text-sm text-muted-foreground">
          노드를 선택하면 상세 정보를 확인하고 수정할 수 있습니다.
        </p>
      </aside>
    );
  }

  return <NodeDetailForm key={node.id} node={node} onUpdate={onUpdate} onDelete={onDelete} />;
}

function NodeDetailForm({
  node,
  onUpdate,
  onDelete,
}: {
  node: Node;
  onUpdate: (nodeId: string, input: UpdateNodeInput) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
}) {
  const data = node.data as unknown as DesignNodeData;
  const Icon = NODE_TYPE_ICON[data.nodeType];

  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description ?? "");
  const [status, setStatus] = useState<NodeStatus>(data.status);
  const [contentText, setContentText] = useState<Record<string, string>>(
    Object.fromEntries(
      NODE_CONTENT_FIELDS.map((field) => [
        field.key,
        contentFieldToText(data.content?.[field.key]),
      ]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const content: DesignNodeContent = {};
    for (const field of NODE_CONTENT_FIELDS) {
      const parsed = textToContentField(contentText[field.key] ?? "");
      if (parsed) content[field.key] = parsed;
    }
    await onUpdate(node.id, {
      title,
      description: description || null,
      status,
      content,
    });
    setIsSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm(`"${title}" 노드를 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    await onDelete(node.id);
    setIsDeleting(false);
  }

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l">
      <div className="flex items-center gap-2 border-b p-4">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {NODE_TYPE_LABEL[data.nodeType]}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-title">노드명</Label>
            <Input id="detail-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-status">상태</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as NodeStatus)}>
              <SelectTrigger id="detail-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NODE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {NODE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-description">설명</Label>
            <Textarea
              id="detail-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          {NODE_CONTENT_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`detail-${field.key}`}>{field.label}</Label>
              <Textarea
                id={`detail-${field.key}`}
                value={contentText[field.key] ?? ""}
                onChange={(e) =>
                  setContentText((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                rows={2}
              />
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between gap-2 border-t p-4">
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
          삭제
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </aside>
  );
}
