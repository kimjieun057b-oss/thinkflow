import { createBrowserClient } from "@supabase/ssr";

// 수동 관리 중인 src/types/database.ts는 supabase-js의 제네릭 스키마 형식과
// 완전히 맞지 않을 수 있어 클라이언트는 비제네릭으로 생성하고, 호출부에서
// Row/Insert/Update 타입을 직접 지정한다. Supabase 프로젝트 연결 후
// `supabase gen types`로 생성한 타입으로 교체하면 제네릭으로 전환할 수 있다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
