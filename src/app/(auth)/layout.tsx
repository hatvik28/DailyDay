import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/80 via-transparent to-transparent dark:from-indigo-950/40"
        aria-hidden
      />
      <div className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
