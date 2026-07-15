import { currentUser } from "@clerk/nextjs/server";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const accountLabel =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Fleet manager";

  return (
    <div className="bg-muted/30 flex min-h-dvh">
      <DashboardSidebar accountLabel={accountLabel} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
