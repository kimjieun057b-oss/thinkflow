import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { Node } from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreateNodeDialog } from "@/components/workspace/panels/create-node-dialog";
import type { DesignNodeData } from "@/components/workspace/nodes/design-node";
import { NODE_STATUS_BADGE_VARIANT, NODE_STATUS_LABEL, NODE_TYPE_ICON } from "@/constants/node";
import { SERVICE_TYPE_LABEL } from "@/constants/project";
import type { NodeType, ProjectRow } from "@/types/database";
import { cn } from "cn";

export function ProjectNavPanel({
  project,
  nodes,
  selectedNodeId,
  onSelectNode,
  onCreateNode,
}: {
  project: ProjectRow;
  nodes: Node[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onCreateNode: (input: { nodeType: NodeType; title: string; description?: string }) => Promise<void>;
}) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r">
      <div className="flex flex-col gap-2 p-4">
        <Button render={<Link href="/dashboard" />} variant="ghost" size="sm" className="w-fit">
          <ArrowLeftIcon />
          대시보드
        </Button>
        <div>
          <h2 className="line-clamp-1 font-medium">{project.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {SERVICE_TYPE_LABEL[project.service_type]}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          노드 ({nodes.length})
        </span>
        <CreateNodeDialog onCreate={onCreateNode} />
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 px-2 pb-4">
          {nodes.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              아직 노드가 없습니다. &quot;새 노드&quot;로 추가하세요.
            </p>
          )}
          {nodes.map((node) => {
            const data = node.data as unknown as DesignNodeData;
            const Icon = NODE_TYPE_ICON[data.nodeType];
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                  selectedNodeId === node.id && "bg-muted",
                )}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1 flex-1">{data.title}</span>
                <Badge variant={NODE_STATUS_BADGE_VARIANT[data.status]} className="shrink-0">
                  {NODE_STATUS_LABEL[data.status]}
                </Badge>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
