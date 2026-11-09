import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { XIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EDGE_TYPES, EDGE_TYPE_LABEL } from "@/constants/node";
import type { EdgeType } from "@/types/database";

export interface DesignEdgeData {
  edgeType: EdgeType;
  onDelete: (edgeId: string) => void;
  onChangeType: (edgeId: string, edgeType: EdgeType) => void;
  [key: string]: unknown;
}

export function DesignEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
}: EdgeProps) {
  const [open, setOpen] = useState(false);
  const { edgeType, onDelete, onChangeType } = (data ?? {}) as unknown as DesignEdgeData;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--ring)" : "var(--border)",
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan flex items-center gap-1 rounded-md bg-popover px-1 py-0.5 text-xs ring-1 ring-foreground/10 shadow-sm"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger className="rounded px-1 text-muted-foreground hover:text-foreground">
                {EDGE_TYPE_LABEL[edgeType]}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {EDGE_TYPES.map((type) => (
                  <DropdownMenuItem key={type} onClick={() => onChangeType(id, type)}>
                    {EDGE_TYPE_LABEL[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => onDelete(id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="연결 삭제"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
