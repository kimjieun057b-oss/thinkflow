"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DesignEdge, type DesignEdgeData } from "@/components/workspace/edges/design-edge";
import { DesignNode } from "@/components/workspace/nodes/design-node";
import type { EdgeType } from "@/types/database";

const nodeTypes = { design: DesignNode };
const edgeTypes = { design: DesignEdge };

export function DesignCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onNodeDragStop,
  onDeleteEdge,
  onChangeEdgeType,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: OnConnect;
  onNodeClick: (nodeId: string) => void;
  onPaneClick: () => void;
  onNodeDragStop: (node: Node) => void;
  onDeleteEdge: (edgeId: string) => void;
  onChangeEdgeType: (edgeId: string, edgeType: EdgeType) => void;
}) {
  const defaultEdgeOptions = useMemo(() => ({ type: "design" as const }), []);

  // 렌더링 시점에 삭제/유형 변경 콜백을 edge.data에 주입한다.
  // (상태에 함수를 저장하지 않고 항상 최신 콜백을 전달하기 위함)
  const displayEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: {
          ...(edge.data as Pick<DesignEdgeData, "edgeType">),
          onDelete: onDeleteEdge,
          onChangeType: onChangeEdgeType,
        } satisfies DesignEdgeData,
      })),
    [edges, onDeleteEdge, onChangeEdgeType],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={displayEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={(connection: Connection) => onConnect(connection)}
      onNodeClick={(_event, node) => onNodeClick(node.id)}
      onPaneClick={onPaneClick}
      onNodeDragStop={(_event, node) => onNodeDragStop(node)}
      defaultEdgeOptions={defaultEdgeOptions}
      deleteKeyCode={null}
      panOnDrag
      panOnScroll={false}
      zoomOnScroll
      zoomOnPinch
      minZoom={0.25}
      maxZoom={1.5}
      fitView
      className="bg-background"
    >
      <Background color="var(--border)" />
      <Controls />
    </ReactFlow>
  );
}
