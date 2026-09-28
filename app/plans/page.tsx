import { endpoints } from "@/lib/apiService";
import PlansClientPage from "./PlansClientPage";
import type { PlanData } from "@/components/user/PlanCard";

export default async function PlansPage() {
  let plans: PlanData[] = [];
  let totalPages = 1;
  try {
    const data = await endpoints.public.getPlans(1, 9);
    plans = Array.isArray(data?.plans) ? data.plans : [];
    totalPages = Math.max(1, Number(data?.total_pages) || 1);
  } catch (error) {
    console.error("Failed to load plans:", error);
  }
  return <PlansClientPage initialPlans={plans} totalPages={totalPages} />;
}
