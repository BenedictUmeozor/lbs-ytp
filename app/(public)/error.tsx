"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 text-stone-600">
        We could not load this page right now. Please try again.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/report">Submit report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/track">Track report</Link>
        </Button>
      </div>
    </div>
  );
}
