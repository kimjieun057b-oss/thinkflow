import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="font-heading text-2xl font-medium">ThinkFlow AI</span>
      <p className="max-w-md text-sm text-muted-foreground">
        AI의 질문과 검토를 통해 설계 사고를 확장하고, 개발에 바로 활용할 수 있는 설계 구조와
        문서를 만드는 시스템 설계 코파일럿입니다.
      </p>
      <div className="flex gap-2">
        <Button render={<Link href="/signup" />} size="lg">
          시작하기
        </Button>
        <Button render={<Link href="/login" />} variant="outline" size="lg">
          로그인
        </Button>
      </div>
    </div>
  );
}
