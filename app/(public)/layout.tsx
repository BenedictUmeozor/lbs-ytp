import { PublicAppShell } from "@/components/public-reports/public-app-shell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicAppShell>{children}</PublicAppShell>;
}
