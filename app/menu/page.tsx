import React from "react";
import Header from "@/components/user/Header";
import BottomNav from "@/components/user/BottomNav";
import ThemeWrapper from "@/components/user/ThemeWrapper";
import MenuSection from "@/components/user/MenuSection";
import { endpoints } from "@/lib/apiService";

export default async function MenuPage() {
  let initialBowls: any[] = [];
  let initialTotal = 0;
  let initialTotalPages = 1;
  let initialCategories: any[] = [];

  try {
    const [menuData, catData] = await Promise.all([
      endpoints.public.getMenu(1, 10, ""),
      endpoints.public.getMealCategories(),
    ]);

    // Normalise field names to match what TopPickCard / BowlListItem expect
    initialBowls = (menuData.bowls || []).map((b: any) => ({
      ...b,
      _id: b.ulid,
      baseCalories: b.macros?.calories ?? 0,
      basePrice: b.price || 0,
      imageId: b.image_url ? { url: b.image_url } : undefined,
    }));
    initialTotal = menuData.total ?? 0;
    initialTotalPages = menuData.total_pages ?? 1;
    initialCategories = catData.categories || [];
  } catch (err) {
    console.error("Menu SSR fetch failed:", err);
  }

  return (
    <ThemeWrapper>
      <div className="min-h-screen bg-transparent flex flex-col font-sans relative pb-24 md:pb-0">
        <div className="w-full mx-auto min-h-screen relative overflow-x-hidden flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">
            <MenuSection
              initialBowls={initialBowls}
              initialTotal={initialTotal}
              initialTotalPages={initialTotalPages}
              initialCategories={initialCategories}
            />
          </main>
          <BottomNav />
        </div>
      </div>
    </ThemeWrapper>
  );
}
