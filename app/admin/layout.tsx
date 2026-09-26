import type { Metadata, Viewport } from "next";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: {
    default: "ProBae Admin",
    template: "%s | ProBae Admin",
  },
  description: "ProBae administration and order management.",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    title: "ProBae Admin",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
