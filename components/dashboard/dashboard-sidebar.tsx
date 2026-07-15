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
			className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-border bg-background lg:w-64"
		>
			<div className="flex items-center gap-2 border-b border-border px-3 py-4 lg:px-4">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<Recycle className="size-5" aria-hidden="true" />
				</div>
				<div className="hidden min-w-0 lg:block">
					<p className="truncate text-sm font-semibold text-foreground">
						Bariga Smart Waste
					</p>
					<p className="truncate text-xs text-muted-foreground">
						Bariga pilot · Proof of concept
					</p>
				</div>
			</div>

			<DashboardNavigation />

			<div className="mt-auto border-t border-border p-3 lg:p-4">
				<div className="flex items-center gap-3">
					<UserButton />
					<div className="hidden min-w-0 lg:block">
						<p
							className="truncate text-sm font-medium text-foreground"
							title={accountLabel}
						>
							{accountLabel}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							Fleet manager
						</p>
					</div>
				</div>
			</div>
		</aside>
	);
}
