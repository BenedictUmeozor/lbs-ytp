import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import "leaflet/dist/leaflet.css";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();

  if (userId === null) {
    redirect("/sign-in");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
