import { redirect } from "next/navigation";

/**
 * Root page — redirects to the login screen.
 * Swap this for a dashboard or landing page once auth is implemented.
 */
export default function RootPage() {
  redirect("/login");
}
