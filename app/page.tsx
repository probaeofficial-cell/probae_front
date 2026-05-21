import { redirect } from "next/navigation";

/**
 * Root page — redirects to the admin login screen.
 */
export default function RootPage() {
  redirect("/admin/login");
}

