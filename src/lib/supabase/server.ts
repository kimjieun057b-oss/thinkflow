import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler / Server Action에서 사용한다.
// Server Component 내부에서는 쿠키를 쓸 수 없으므로 setAll 실패를 무시한다
// (미들웨어가 세션 갱신을 담당한다).
// 타입은 비제네릭으로 생성하고 호출부에서 Row/Insert/Update 타입을 직접 지정한다
// (src/types/database.ts 상단 설명 참고).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 호출된 경우 무시한다.
          }
        },
      },
    },
  );
}
