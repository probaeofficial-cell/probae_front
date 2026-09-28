import { endpoints } from "@/lib/apiService";
import ThemeWrapper from "@/components/user/ThemeWrapper";
import React from "react";
import Header from "@/components/user/Header";
import BottomNav from "@/components/user/BottomNav";
import BowlCard from "@/components/user/BowlCard";
import PlanCard from "@/components/user/PlanCard";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Utensils, Salad } from "lucide-react";
import FadeInUp from "@/components/animations/FadeInUp";
import OptimizingSection from "@/components/animations/OptimizingSection";
import FrameSequenceCanvas from "@/components/animations/FrameSequenceCanvasLoader";
import { preload } from "react-dom";

// This is a Server Component
export default async function LandingPage() {
  // Preload the very first frame so the animation canvas can bootstrap instantly
  preload("/frames/frame_001.webp", { as: "image", fetchPriority: "high" });
  // Fetch bowls from public API
  let serializedBowls: any[] = [];
  let planPreview: any[] = [];
  try {
    const res: any = await endpoints.public.getMenu();
    if (res && res.success) {
      const bowls = res.bowls || [];
      
      const bBowls = bowls.filter((b: any) => b.mealTypes?.includes("B"));
      const lBowls = bowls.filter((b: any) => b.mealTypes?.includes("L") && !b.mealTypes?.includes("B"));
      const dBowls = bowls.filter((b: any) => b.mealTypes?.includes("D") && !b.mealTypes?.includes("L") && !b.mealTypes?.includes("B"));
      
      const interleavedBowls = [];
      const maxLength = Math.max(bBowls.length, lBowls.length, dBowls.length);
      for (let i = 0; i < maxLength; i++) {
        if (bBowls[i]) interleavedBowls.push(bBowls[i]);
        if (lBowls[i]) interleavedBowls.push(lBowls[i]);
        if (dBowls[i]) interleavedBowls.push(dBowls[i]);
      }
      
      serializedBowls = interleavedBowls.slice(0, 8).map((b: any) => ({
        ...b,
        _id: b.ulid, // Map ulid to _id for existing component compatibility
        imageId: b.image_url ? { url: b.image_url } : null
      }));
    }
  } catch (error) {
    console.error("Failed to fetch bowls:", error);
  }
  try {
    const planData: any = await endpoints.public.getPlans(1, 3);
    planPreview = Array.isArray(planData?.plans) ? planData.plans : [];
  } catch (error) {
    console.error("Failed to fetch plans preview:", error);
  }

  return (
    <ThemeWrapper>
    <div className="min-h-screen bg-transparent flex flex-col font-sans relative pb-24 md:pb-0">
      {/* Edge-to-edge container */}
      <div className="w-full mx-auto min-h-screen relative overflow-x-hidden flex flex-col">
        <Header />

        <main className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">
          
          {/* 1. HERO SECTION */}
          <section className="relative flex flex-col lg:flex-row-reverse items-center justify-center pt-32 pb-12 px-6 lg:px-12 lg:pt-40 lg:pb-24 gap-10 md:gap-14 lg:gap-20">
            
            {/* Circular Bowl Image with Slanted Banner (Right on Desktop) */}
            <FadeInUp delay={0.2} duration={1} className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] lg:w-[400px] lg:h-[400px] flex items-center justify-center mb-8 lg:mb-0 shrink-0">
              {/* Slanted Green Banner */}
              <div className="absolute top-1/2 left-1/2 w-[150%] lg:w-[200%] h-12 lg:h-16 bg-[#15803D] -translate-x-1/2 -translate-y-1/2 -rotate-12 flex items-center overflow-hidden z-0">
                <div className="flex gap-4 text-white font-bold tracking-[0.2em] whitespace-nowrap opacity-90 text-sm lg:text-lg animate-marquee">
                  <span>PROPER • LIVE</span>
                  <span>PROPER • LIVE</span>
                  <span>PROPER • LIVE</span>
                  <span>PROPER • LIVE</span>
                  <span>PROPER • LIVE</span>
                  <span>PROPER • LIVE</span>
                </div>
              </div>
              
              {/* Circle Image */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden border-[6px] border-[#F8F9FA] z-10 shadow-2xl">
                <Image 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
                  alt="Delicious Bowl"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </FadeInUp>

            {/* Hero Text & CTA (Left on Desktop) */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:flex-1 max-w-xl md:max-w-2xl">
              <FadeInUp delay={0.1} className="mb-10">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-gray-900 leading-[1.15] lg:leading-[1.1] tracking-tight">
                  Eat for your <span className="text-[#15803D]">body</span>.<br/>
                  Not the <span className="relative inline-block">
                    crowd
                    <span className="absolute top-1/2 left-[-5%] w-[110%] h-[3px] md:h-[5px] bg-[#F97316] -translate-y-1/2 rotate-2"></span>
                  </span>.
                </h1>
              </FadeInUp>

              {/* CTA Button with dashed offset border */}
              <FadeInUp delay={0.3} className="relative mb-14 group z-20">
                <div className="absolute inset-0 border-2 border-dashed border-[#F97316] rounded-xl translate-x-1.5 translate-y-1.5 pointer-events-none transition-transform group-hover:translate-x-2 group-hover:translate-y-2"></div>
                <Link href="/onboarding" className="relative bg-[#F97316] text-white px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 transition-transform">
                  Order from Probae
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                </Link>
              </FadeInUp>

              {/* Stats Row */}
              <FadeInUp delay={0.4} className="w-full flex justify-between items-center px-4 md:px-12 lg:px-2 py-4 lg:py-6 border-t border-gray-200/60 lg:gap-8 lg:justify-start">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <span className="text-[#8B5CF6] font-bold text-xl md:text-2xl">50+</span>
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-tight mt-1">Bowls<br/>Crafted</span>
                </div>
                <div className="h-8 md:h-12 w-px bg-gray-200/60"></div>
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <span className="text-[#10B981] font-bold text-xl md:text-2xl">3</span>
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-tight mt-1">Daily<br/>Meals</span>
                </div>
                <div className="h-8 md:h-12 w-px bg-gray-200/60"></div>
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <span className="text-[#F97316] font-bold text-xl md:text-2xl">100%</span>
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-tight mt-1">Balanced<br/>Macros</span>
                </div>
              </FadeInUp>
            </div>
          </section>

          {/* 2. BOWL DECONSTRUCTION — scroll-pinned canvas frame sequence */}
          <FrameSequenceCanvas
            frameCount={240}
            frameBasePath="/frames/frame_"
            frameExtension="webp"
            frameDigits={3}
            scrollHeight="350vh"
            overlayText="Every ingredient, precisely placed."
          />

          {/* 3. MENU SECTION (Original Flip Cards) */}
          <section className="bg-white rounded-[40px] pt-10 md:pt-16 pb-10 md:pb-16 px-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex flex-col relative z-20">
            <FadeInUp className="px-8 md:px-0 text-center mb-10 md:mb-16 flex flex-col items-center max-w-3xl mx-auto">
              <div className="text-[#15803D] mb-4">
                <Utensils className="w-8 h-8 md:w-10 md:h-10 mx-auto" strokeWidth={2.5} />
              </div>
              <p className="text-gray-500 text-sm md:text-lg leading-relaxed mb-6 md:mb-8 px-2 md:px-0">
                Enjoy vibrant, nutrient-rich salads that burst with flavor, promoting vitality and freshness. These delicious meals are perfect for enhancing your overall well-being and keeping you energized throughout the day.
              </p>
              <Link href="/menu" className="bg-[#F97316] text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 md:text-lg hover:-translate-y-0.5 transition-transform">
                Browse The Menu
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
              </Link>
            </FadeInUp>

            {/* Horizontal Scroll on All Devices */}
            <div className="w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 sm:px-6 md:px-10 py-4">
              <div className={`flex gap-4 sm:gap-5 md:gap-6 ${serializedBowls.length === 0 ? "w-full justify-center" : "w-max"}`}>
                {serializedBowls.map((bowl, index) => (
                  <FadeInUp key={bowl._id} delay={index * 0.1} yOffset={20}>
                    <BowlCard bowl={bowl as any} index={index} />
                  </FadeInUp>
                ))}
                
                {/* Fallback if no bowls in DB */}
                {serializedBowls.length === 0 && (
                  <div className="w-[300px] h-[450px] bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center p-8 shadow-sm shrink-0">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 border border-orange-100/50">
                      <Salad className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">Fresh Bowls Brewing!</h3>
                    <p className="text-sm text-gray-500">We're currently preparing our menu. Check back soon for our latest curated selections.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 4. PLANS PREVIEW SECTION */}
          <section className="bg-gray-50 py-16 md:py-24 px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">Choose Your <span className="text-[#16A34A]">Plan</span></h2>
                <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">Structured nutrition programs designed around your lifestyle and goals.</p>
              </div>
              {planPreview.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">{planPreview.map((plan: any) => <PlanCard key={plan.ulid} plan={plan} />)}</div> : <div className="text-center py-12 text-gray-400">Plans coming soon...</div>}
              <div className="flex justify-center"><Link href="/plans" className="bg-[#6A0FAD] text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 hover:-translate-y-0.5 transition-transform shadow-lg">View All Plans <ArrowRight className="w-5 h-5" strokeWidth={2.5} /></Link></div>
            </div>
          </section>

          {/* 5. CUSTOM BOWL CTA */}
          <section className="py-8 px-6">
            <div className="bg-[#F97316] rounded-[28px] p-12 md:p-20 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Want Something Else?</h2>
              <p className="text-white/90 text-base md:text-lg mb-8 max-w-md">Get a fully customized bowl tailored exactly to your unique needs.</p>
              <Link href="/onboarding" className="w-full max-w-sm border-2 border-white/50 text-white font-bold py-4 rounded-2xl text-lg hover:bg-white/10 transition-colors">Order your custom bowl</Link>
            </div>
          </section>

          {/* 3. OPTIMIZING SECTION */}
          <OptimizingSection />

        </main>
        <BottomNav />
      </div>
    </div>
    </ThemeWrapper>
  );
}
