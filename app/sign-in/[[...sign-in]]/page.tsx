import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Bariga Smart Waste",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-600">Bariga pilot</p>
          <h1 className="text-2xl font-semibold text-zinc-950">
            Bariga Smart Waste
          </h1>
          <p className="text-sm text-zinc-600">Proof of concept</p>
        </div>
        <SignIn fallbackRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
