export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-heading text-xl font-medium">ThinkFlow AI</span>
        </div>
        {children}
      </div>
    </div>
  );
}
