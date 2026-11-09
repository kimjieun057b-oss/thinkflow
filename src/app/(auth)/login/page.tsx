import { LoginForm } from "@/components/auth/login-form";

// confirmEmail 쿼리값에 따라 달라지는 페이지라 프리렌더링 대상에서 제외한다.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmEmail?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm confirmEmail={params.confirmEmail === "1"} />;
}
