import { endpoints } from "@/lib/apiService";
import ThemeWrapper from "@/components/user/ThemeWrapper";
import React from "react";
import Header from "@/components/user/Header";
import BottomNav from "@/components/user/BottomNav";
import MenuSection from "@/components/user/MenuSection";

export default async function MenuPage() {
  // Fetch active bowls from public API
  let serializedBowls = [];
  try {
    const res: any = await endpoints.public.getMenu();
    if (res && res.success) {
      const bowls = res.bowls || [];
      
      serializedBowls = bowls.map((bowl: any) => ({
        _id: bowl.ulid, // Map ulid to _id for compatibility
        name: bowl.name,
        baseCalories: bowl.macros.calories, // Mapped from backend macros
        basePrice: 0, // Public API hides pricing
        macros: bowl.macros,
        category: bowl.category_name,
        mealTypes: bowl.mealTypes,
        micros: [], // Omitted from public API for now
        ingredients: [], // Omitted from public API for now
        imageId: bowl.image_url ? { url: bowl.image_url } : undefined,
      }));
    }
  } catch (error) {
    console.error("Failed to fetch bowls:", error);
  }

  return (
    <ThemeWrapper>
    <div className="min-h-screen bg-transparent flex flex-col font-sans relative pb-24 md:pb-0">
      {/* Edge-to-edge container */}
      <div className="w-full mx-auto min-h-screen relative overflow-x-hidden flex flex-col">
        <Header />

        <main className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">
          {/* We only render the MenuSection on this page */}
          <MenuSection bowls={serializedBowls} />
        </main>

        <BottomNav />
      </div>
    </div>
    </ThemeWrapper>
  );
}
