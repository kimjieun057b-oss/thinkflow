import { Handle, Position, type NodeProps } from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NODE_STATUS_BADGE_VARIANT, NODE_STATUS_LABEL, NODE_TYPE_ICON } from "@/constants/node";
import type { DesignNodeContent, NodeStatus, NodeType } from "@/types/database";
import { cn } from "cn";

export interface DesignNodeData {
  title: string;
  description: string | null;
  nodeType: NodeType;
  status: NodeStatus;
  content: DesignNodeContent;
  [key: string]: unknown;
}

const STATUS_ACCENT: Record<NodeStatus, string> = {
  not_started: "",
  in_progress: "border-l-2 border-l-info",
  decided: "",
  needs_review: "ring-1 ring-warning/40",
};

export function DesignNode({ data, selected }: NodeProps) {
  const { title, description, nodeType, status } = data as unknown as DesignNodeData;
  const Icon = NODE_TYPE_ICON[nodeType];

  return (
    <div className="w-[280px]">
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <Card
        className={cn(
          "transition-shadow",
          STATUS_ACCENT[status],
          selected && "shadow-md ring-[3px] ring-ring/50",
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{nodeType}</span>
            </div>
            <Badge variant={NODE_STATUS_BADGE_VARIANT[status]}>{NODE_STATUS_LABEL[status]}</Badge>
          </div>
          <CardTitle className="line-clamp-1">{title}</CardTitle>
        </CardHeader>
        {description && (
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          </CardContent>
        )}
      </Card>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}
