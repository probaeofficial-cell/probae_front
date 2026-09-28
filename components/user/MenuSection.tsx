"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Salad } from "lucide-react";
import { motion } from "framer-motion";
import TopPickCard from "./TopPickCard";
import BowlListItem from "./BowlListItem";
import BowlModal from "./BowlModal";

interface MenuSectionProps {
  bowls: any[];
}

export default function MenuSection({ bowls }: MenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedBowl, setSelectedBowl] = useState<any | null>(null);
  const [itemsToShow, setItemsToShow] = useState(5);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setItemsToShow(5);
  };

  // Categories for the pills
  const categories = ["All", "Breakfast", "Lunch", "Dinner"];

  // Filter logic (simplified for now based on MealTypes or just showing a subset)
  const filteredBowls = bowls.filter(bowl => {
    if (selectedCategory === "All") return true; // Show all for Best Sellers as placeholder
    if (selectedCategory === "Breakfast") return bowl.mealTypes?.includes('B');
    if (selectedCategory === "Lunch") return bowl.mealTypes?.includes('L');
    if (selectedCategory === "Dinner") return bowl.mealTypes?.includes('D');
    return true;
  });

  // Top picks can just be the first 5 active bowls
  const topPicks = bowls.slice(0, 5);

  // Pagination logic
  const paginatedBowls = filteredBowls.slice(0, itemsToShow);

  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node) {
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          setItemsToShow(prev => prev + 5);
        }
      }, {
        rootMargin: '200px',
        threshold: 0.1
      });
      observerRef.current.observe(node);
    }
  }, []);

  return (
    <section id="menu-section" className="bg-white/70 backdrop-blur-3xl rounded-t-[40px] pt-32 md:pt-40 pb-24 md:pb-32 flex flex-col relative z-20 min-h-screen shadow-[0_-10px_40px_rgba(0,0,0,0.03)] border-t border-white/50">
      
      {/* Back Button */}
      <div className="px-6 md:px-12 mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-5 py-2.5 rounded-xl font-bold w-fit text-sm">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          Back to Home
        </Link>
      </div>

      {/* Today's Top Picks */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 px-6 md:px-12 mb-6">Today's Top Picks</h2>
        
        {/* Horizontal Scroll */}
        <div className="w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 md:px-12 pb-8">
          <div className="flex gap-4 w-max">
            {topPicks.map((bowl, index) => (
              <TopPickCard 
                key={bowl._id} 
                bowl={bowl} 
                index={index} 
                onClick={() => setSelectedBowl(bowl)} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* All Bowls */}
      <div className="px-6 md:px-12 flex-1 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-6">All Bowls</h2>
        
        {/* Filter Pills */}
        <div className="w-full overflow-x-auto hide-scrollbar mb-6">
          <div className="flex gap-2 w-max pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  selectedCategory === cat 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "bg-white text-gray-600 border-gray-200/60 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical List */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50 flex-1 flex flex-col">
          {paginatedBowls.length > 0 ? (
            <div className="flex flex-col flex-1">
              {paginatedBowls.map((bowl, index) => {
                const isLast = index === paginatedBowls.length - 1;
                return (
                  <div key={bowl._id} ref={isLast ? lastElementRef : null}>
                    <BowlListItem 
                      bowl={bowl} 
                      onClick={() => setSelectedBowl(bowl)} 
                    />
                  </div>
                );
              })}
              
              {/* Load More Indicator or Caught Up Message */}
              {filteredBowls.length > itemsToShow ? (
                <div className="flex justify-center items-center gap-2 mt-6 pt-6 pb-4 border-t border-gray-100 text-gray-400 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading more bowls...
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center mt-8 pt-8 pb-4 border-t border-gray-100/50 px-2 gap-3"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-10 h-10 text-[#10B981]" strokeWidth={2} />
                  </motion.div>
                  <span className="text-gray-500 font-bold tracking-tight text-sm text-center">
                    You're all caught up!
                  </span>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="w-full h-[350px] bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center p-8 shadow-sm mt-4">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 border border-purple-100/50">
                <Salad className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">No Bowls Here!</h3>
              <p className="text-sm text-gray-500 max-w-[250px]">We couldn't find any bowls in this category right now. Try selecting another one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Bottom Sheet */}
      <BowlModal bowl={selectedBowl} onClose={() => setSelectedBowl(null)} />
      
    </section>
  );
}
