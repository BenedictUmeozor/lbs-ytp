import { UserButton } from "@clerk/nextjs";
import { Recycle } from "lucide-react";

import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

type DashboardSidebarProps = {
  accountLabel: string;
};

export function DashboardSidebar({ accountLabel }: DashboardSidebarProps) {
  return (
    <aside
      aria-label="Fleet manager dashboard"
      className="border-border bg-background sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r lg:w-64"
    >
      <div className="border-border flex items-center gap-2 border-b px-3 py-4 lg:px-4">
        <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Recycle className="size-5" aria-hidden="true" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <p className="text-foreground truncate text-sm font-semibold">
            Bariga Smart Waste
          </p>
          <p className="text-muted-foreground truncate text-xs">
            Bariga pilot · Proof of concept
          </p>
        </div>
      </div>

      <DashboardNavigation />

      <div className="border-border mt-auto border-t p-3 lg:p-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <div className="hidden min-w-0 lg:block">
            <p
              className="text-foreground truncate text-sm font-medium"
              title={accountLabel}
            >
              {accountLabel}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              Fleet manager
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
