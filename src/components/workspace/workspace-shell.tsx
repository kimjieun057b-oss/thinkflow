"use client";

import { useCallback, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { toast } from "sonner";

import { DesignCanvas } from "@/components/workspace/canvas/design-canvas";
import type { DesignEdgeData } from "@/components/workspace/edges/design-edge";
import type { DesignNodeData } from "@/components/workspace/nodes/design-node";
import { NodeDetailPanel } from "@/components/workspace/panels/node-detail-panel";
import { ProjectNavPanel } from "@/components/workspace/panels/project-nav-panel";
import type { UpdateNodeInput } from "@/lib/validations/node";
import type {
  DesignNodeRow,
  EdgeType,
  NodeConnectionRow,
  NodeType,
  ProjectRow,
} from "@/types/database";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function rowToNode(row: DesignNodeRow): Node {
  return {
    id: row.id,
    type: "design",
    position: row.position,
    data: {
      title: row.title,
      description: row.description,
      nodeType: row.node_type,
      status: row.status,
      content: row.content,
    } satisfies DesignNodeData,
  };
}

// 콜백(onDelete/onChangeType)은 상태에 저장하지 않고 DesignCanvas에서 렌더링 시점에 주입한다
// (렌더 순서에 따라 함수가 재정의되는 이 컴포넌트와 분리하기 위함).
function rowToEdge(row: NodeConnectionRow): Edge {
  return {
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    type: "design",
    data: { edgeType: row.edge_type } satisfies Pick<DesignEdgeData, "edgeType">,
  };
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "저장 중..."
      : status === "saved"
        ? "저장됨"
        : status === "error"
          ? "저장 실패"
          : "";
  if (!label) return null;
  return (
    <span
      className={
        "text-xs " + (status === "error" ? "text-destructive" : "text-muted-foreground")
      }
    >
      {label}
    </span>
  );
}

export function WorkspaceShell({
  project,
  initialNodes,
  initialConnections,
}: {
  project: ProjectRow;
  initialNodes: DesignNodeRow[];
  initialConnections: NodeConnectionRow[];
}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>(() => initialNodes.map(rowToNode));
  const [edges, setEdges] = useState<Edge[]>(() => initialConnections.map(rowToEdge));

  const withSaveStatus = useCallback(async (fn: () => Promise<Response>) => {
    setSaveStatus("saving");
    try {
      const res = await fn();
      if (!res.ok) throw new Error("request failed");
      setSaveStatus("saved");
      return res;
    } catch (err) {
      setSaveStatus("error");
      toast.error("저장에 실패했습니다.");
      throw err;
    }
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const handleNodeDragStop = useCallback(
    (node: Node) => {
      withSaveStatus(() =>
        fetch(`/api/nodes/${node.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: node.position }),
        }),
      ).catch(() => {});
    },
    [withSaveStatus],
  );

  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      try {
        const res = await withSaveStatus(() =>
          fetch(`/api/projects/${project.id}/connections`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceNodeId: connection.source,
              targetNodeId: connection.target,
            }),
          }),
        );
        const body = await res.json();
        const row = body.connection as NodeConnectionRow;
        setEdges((eds) => [...eds, rowToEdge(row)]);
      } catch {
        // 실패 토스트는 withSaveStatus에서 처리
      }
    },
    [project.id, withSaveStatus],
  );

  const handleDeleteConnection = useCallback(
    (edgeId: string) => {
      withSaveStatus(() => fetch(`/api/connections/${edgeId}`, { method: "DELETE" }))
        .then(() => setEdges((eds) => eds.filter((e) => e.id !== edgeId)))
        .catch(() => {});
    },
    [withSaveStatus],
  );

  const handleChangeConnectionType = useCallback(
    (edgeId: string, edgeType: EdgeType) => {
      withSaveStatus(() =>
        fetch(`/api/connections/${edgeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edgeType }),
        }),
      )
        .then(() =>
          setEdges((eds) =>
            eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, edgeType } } : e)),
          ),
        )
        .catch(() => {});
    },
    [withSaveStatus],
  );

  const handleCreateNode = useCallback(
    async (input: { nodeType: NodeType; title: string; description?: string }) => {
      const index = nodes.length;
      const position = {
        x: 100 + (index % 4) * 320,
        y: 100 + Math.floor(index / 4) * 180,
      };
      try {
        const res = await withSaveStatus(() =>
          fetch(`/api/projects/${project.id}/nodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...input, position }),
          }),
        );
        const body = await res.json();
        const row = body.node as DesignNodeRow;
        setNodes((nds) => [...nds, rowToNode(row)]);
        setSelectedNodeId(row.id);
      } catch {
        // 실패 토스트는 withSaveStatus에서 처리
      }
    },
    [nodes.length, project.id, withSaveStatus],
  );

  const handleUpdateNode = useCallback(
    async (nodeId: string, input: UpdateNodeInput) => {
      try {
        const res = await withSaveStatus(() =>
          fetch(`/api/nodes/${nodeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }),
        );
        const body = await res.json();
        const row = body.node as DesignNodeRow;
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? rowToNode(row) : n)));
        toast.success("노드를 저장했습니다.");
      } catch {
        // 실패 토스트는 withSaveStatus에서 처리
      }
    },
    [withSaveStatus],
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      try {
        await withSaveStatus(() => fetch(`/api/nodes/${nodeId}`, { method: "DELETE" }));
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedNodeId((current) => (current === nodeId ? null : current));
        toast.success("노드를 삭제했습니다.");
      } catch {
        // 실패 토스트는 withSaveStatus에서 처리
      }
    },
    [withSaveStatus],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">Design Workspace</span>
        <SaveStatusIndicator status={saveStatus} />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ProjectNavPanel
          project={project}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onCreateNode={handleCreateNode}
        />
        <div className="relative flex-1">
          <DesignCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={setSelectedNodeId}
            onPaneClick={() => setSelectedNodeId(null)}
            onNodeDragStop={handleNodeDragStop}
            onDeleteEdge={handleDeleteConnection}
            onChangeEdgeType={handleChangeConnectionType}
          />
        </div>
        <NodeDetailPanel
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
        />
      </div>
    </div>
  );
}
