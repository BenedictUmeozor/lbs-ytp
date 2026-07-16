import { Recycle } from "lucide-react";
import Link from "next/link";

export function PublicAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-950">
      <header className="border-b border-emerald-950/10 bg-emerald-950 text-stone-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/report" className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime-300 text-emerald-950">
              <Recycle className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold tracking-tight">
                Bariga Smart Waste
              </span>
              <span className="block text-xs text-emerald-100">
                Bariga pilot · Proof of concept
              </span>
            </span>
          </Link>
          <nav aria-label="Public app" className="flex shrink-0 gap-1 text-sm">
            <Link
              href="/report"
              className="rounded-md px-3 py-2 font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
            >
              Submit report
            </Link>
            <Link
              href="/track"
              className="rounded-md px-3 py-2 font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
            >
              Track report
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
