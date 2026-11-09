import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NODE_TYPE_ICON, NODE_TYPE_LABEL } from "@/constants/node";
import type { ImportedDesignAnalysis } from "@/types/database";

export function AnalysisResultView({ result }: { result: ImportedDesignAnalysis }) {
  const componentById = new Map(result.systemComponents.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>분석 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{result.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>구성요소 ({result.systemComponents.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {result.systemComponents.length === 0 && (
            <p className="text-sm text-muted-foreground">추출된 구성요소가 없습니다.</p>
          )}
          {result.systemComponents.map((component) => {
            const Icon = NODE_TYPE_ICON[component.type];
            return (
              <div
                key={component.id}
                className="flex items-start gap-2 rounded-md border px-3 py-2"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{component.title}</span>
                    <Badge variant="secondary">{NODE_TYPE_LABEL[component.type]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{component.description}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>파일 간 연결 ({result.connections.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {result.connections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              파일 간 이름 일치를 기준으로 추정한 연결이 없습니다.
            </p>
          )}
          {result.connections.map((connection, i) => {
            const source = componentById.get(connection.sourceId);
            const target = componentById.get(connection.targetId);
            if (!source || !target) return null;
            return (
              <div
                key={`${connection.sourceId}-${connection.targetId}-${i}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="line-clamp-1 flex-1 font-medium">{source.title}</span>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1 flex-1 font-medium">{target.title}</span>
                <Badge variant="outline" className="shrink-0">
                  신뢰도 {Math.round(connection.confidence * 100)}%
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {result.unresolvedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>미해결 항목 ({result.unresolvedItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              근거가 부족해 연결 또는 결론을 확정하지 않은 항목입니다. 확정적인 오류가 아니라
              확인이 필요한 항목으로 표시됩니다.
            </p>
            <Separator />
            {result.unresolvedItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
