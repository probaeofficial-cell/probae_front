"use client";
import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, CheckCircle2, Search, Plus, Trash2, User, Activity } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { endpoints } from "@/lib/apiService";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function NewOrderPage() {
  const router = useRouter();
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [bowls, setBowls] = useState<any[]>([]);
  const [mealCategories, setMealCategories] = useState<any[]>([]);
  
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Custom Search States
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [bowlSearch, setBowlSearch] = useState("");
  const [isBowlOpen, setIsBowlOpen] = useState(false);
  const [selectedBowl, setSelectedBowl] = useState<any>(null);
  
  const [selectedMealSlot, setSelectedMealSlot] = useState("");

  useEffect(() => {
    if (mealCategories.length > 0 && !selectedMealSlot) {
      setSelectedMealSlot(mealCategories[0].slug || mealCategories[0].name);
    }
  }, [mealCategories, selectedMealSlot]);

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custData, bowlData, mealCatData] = await Promise.all([
          endpoints.customers.list({ limit: 100 }) as any,
          endpoints.bowls.getBowls(1, 100) as any,
          endpoints.mealCategories.getMealCategories(1, 100) as any
        ]);
        if (custData.success) setCustomers(custData.customers || []);
        if (bowlData.items) setBowls(bowlData.items || []); else if (bowlData.bowls) setBowls(bowlData.bowls || []);
        if (mealCatData.items) setMealCategories(mealCatData.items || []); else if (mealCatData.categories) setMealCategories(mealCatData.categories || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch));
  const filteredBowls = bowls.filter(b => b.name.toLowerCase().includes(bowlSearch.toLowerCase()));

  const handleAddBowl = async () => {
    if (!selectedCustomer || !selectedBowl || !selectedMealSlot) return;
    
    setIsPreviewLoading(true);
    try {
      const data = await endpoints.orders.preview({
        customer_ulid: selectedCustomer.ulid,
        bowl_ulid: selectedBowl.ulid,
        meal_slot: selectedMealSlot
      }) as any;

      if (data.success && data.preview) {
        setOrderItems([
          ...orderItems,
          {
            id: Math.random().toString(36).substr(2, 9),
            bowlUlid: selectedBowl.ulid,
            bowlName: selectedBowl.name,
            mealSlot: selectedMealSlot,
            quantity: 1,
            previewData: data.preview,
            workingIngredients: JSON.parse(JSON.stringify(data.preview.ingredients))
          }
        ]);
        // Reset selection
        setSelectedBowl(null);
        setBowlSearch("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const updateItemQuantity = (index: number, qty: number) => {
    const newItems = [...orderItems];
    newItems[index].quantity = Math.max(1, qty);
    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  // Handle manual weight tweak inside a specific item
  const handleWeightChange = (itemIndex: number, ingIndex: number, newWeightStr: string) => {
    const newWeight = parseFloat(newWeightStr) || 0;
    const newItems = [...orderItems];
    const item = newItems[itemIndex];
    const ing = item.workingIngredients[ingIndex];
    
    const originalScaledWeight = item.previewData.ingredients[ingIndex].new_weight;
    const ratio = originalScaledWeight > 0 ? (newWeight / originalScaledWeight) : 0;
    
    ing.new_weight = newWeight;
    ing.calories = item.previewData.ingredients[ingIndex].calories * ratio;
    ing.protein = item.previewData.ingredients[ingIndex].protein * ratio;
    ing.carbs = item.previewData.ingredients[ingIndex].carbs * ratio;
    ing.fat = item.previewData.ingredients[ingIndex].fat * ratio;
    ing.fiber = item.previewData.ingredients[ingIndex].fiber * ratio;
    ing.cost = item.previewData.ingredients[ingIndex].cost * ratio;
    
    setOrderItems(newItems);
  };

  // Calculate live totals for an item
  const getItemLiveTotals = (item: any) => {
    const totals = item.workingIngredients.reduce((acc: any, ing: any) => {
      acc.cals += ing.calories;
      acc.pro += ing.protein;
      acc.carb += ing.carbs;
      acc.fat += ing.fat;
      acc.cost += ing.cost;
      return acc;
    }, { cals: 0, pro: 0, carb: 0, fat: 0, cost: 0 });

    const packagingCost = item.previewData ? (item.previewData.final_price - item.previewData.new_raw_material_cost) : 0;
    totals.finalPrice = totals.cost + packagingCost;
    return totals;
  };

  // Grand total across all items (price * qty)
  const grandTotal = orderItems.reduce((sum, item) => {
    const totals = getItemLiveTotals(item);
    return sum + (totals.finalPrice * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    if (!selectedCustomer || orderItems.length === 0) return;
    setIsSubmitting(true);
    
    const payloadItems = orderItems.map(item => {
      const totals = getItemLiveTotals(item);
      return {
        meal_slot: item.mealSlot,
        bowl_ulid: item.bowlUlid,
        quantity: item.quantity,
        adjusted_calories: totals.cals,
        adjusted_protein: totals.pro,
        adjusted_carbs: totals.carb,
        adjusted_fat: totals.fat,
        adjusted_fiber: item.workingIngredients.reduce((sum: number, ing: any) => sum + ing.fiber, 0),
        adjusted_price: totals.finalPrice,
        adjusted_ingredients: item.workingIngredients
      };
    });

    try {
      const data = await endpoints.orders.checkout({
        customer_ulid: selectedCustomer.ulid,
        target_date: targetDate,
        items: payloadItems
      }) as any;
      
      if (data.success) {
        router.push("/admin/orders");
      }
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden relative">
        <Header />
        <Breadcrumbs segments={["Admin", "Orders", "Create Custom Order"]} />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full space-y-8 pb-32 pt-2">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders" className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </Link>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Create Custom Order</h1>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-8">
            
            {/* Top Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Target Date</label>
                <input 
                  type="date" 
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] outline-none"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Select Customer</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomer(null);
                      setIsCustomerOpen(true);
                    }}
                    onFocus={() => setIsCustomerOpen(true)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-neutral-900 font-medium focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] outline-none"
                  />
                  {isCustomerOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-sm text-neutral-500 text-center">No customers found</div>
                      ) : (
                        filteredCustomers.map(c => (
                          <div 
                            key={c.ulid}
                            className="px-4 py-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearch(c.name);
                              setIsCustomerOpen(false);
                            }}
                          >
                            <div className="font-bold text-neutral-900">{c.name}</div>
                            <div className="text-xs text-neutral-500">{c.phone}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Detail Card */}
            {selectedCustomer && (
              <div className="bg-[#f8f5fb] border border-[#6A0FAD]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-neutral-200 shadow-sm shrink-0">
                  <User className="w-8 h-8 text-[#6A0FAD]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-neutral-900">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-600">
                      <Activity className="w-4 h-4 text-[#6A0FAD]" />
                      Goal: <span className="text-neutral-900 font-bold uppercase">{selectedCustomer.goal}</span>
                    </div>
                    {selectedCustomer.calorie_profile?.tdee && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-600">
                        Total TDEE: <span className="text-neutral-900 font-bold">{Math.round(selectedCustomer.calorie_profile.tdee)} kcal</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Bowl Section */}
            {selectedCustomer && (
              <div className="pt-6 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5 relative">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Bowl Recipe</label>
                  <div className="relative">
                    <Search className="absolute inset-y-0 left-0 pl-4 h-full w-8 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search bowls..."
                      value={selectedBowl ? selectedBowl.name : bowlSearch}
                      onChange={(e) => {
                        setBowlSearch(e.target.value);
                        setSelectedBowl(null);
                        setIsBowlOpen(true);
                      }}
                      onFocus={() => setIsBowlOpen(true)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-neutral-900 font-medium focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] outline-none"
                    />
                    {isBowlOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredBowls.length === 0 ? (
                          <div className="p-4 text-sm text-neutral-500 text-center">No bowls found</div>
                        ) : (
                          filteredBowls.map(b => (
                            <div 
                              key={b.ulid}
                              className="px-4 py-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0"
                              onClick={() => {
                                setSelectedBowl(b);
                                setBowlSearch(b.name);
                                setIsBowlOpen(false);
                              }}
                            >
                              <div className="font-bold text-neutral-900">{b.name}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Meal Slot Target</label>
                  <select 
                    value={selectedMealSlot}
                    onChange={(e) => setSelectedMealSlot(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] outline-none appearance-none"
                  >
                    {mealCategories.map(cat => (
                      <option key={cat.ulid} value={cat.slug || cat.name}>{cat.name} Target</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <button 
                    onClick={handleAddBowl}
                    disabled={!selectedBowl || isPreviewLoading}
                    className="w-full h-[50px] flex items-center justify-center gap-2 bg-[#6A0FAD] text-white font-bold rounded-xl hover:bg-[#5b0c96] transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isPreviewLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Add to Order
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Render Added Bowls */}
          <div className="space-y-6">
            {orderItems.map((item, itemIndex) => {
              const liveTotals = getItemLiveTotals(item);
              return (
                <div key={item.id} className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase bg-[#6A0FAD] text-white">
                          {item.mealSlot}
                        </span>
                        <h2 className="font-black text-neutral-900 text-lg">{item.bowlName}</h2>
                      </div>
                      <p className="text-xs text-neutral-500 font-medium">Auto-scaled by AI based on customer targets. Tweak ingredients below.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden">
                        <button onClick={() => updateItemQuantity(itemIndex, item.quantity - 1)} className="px-3 py-2 text-neutral-600 hover:bg-neutral-100 font-bold transition-colors">-</button>
                        <div className="px-4 py-2 font-black text-neutral-900 border-x border-neutral-200 bg-neutral-50">{item.quantity}</div>
                        <button onClick={() => updateItemQuantity(itemIndex, item.quantity + 1)} className="px-3 py-2 text-neutral-600 hover:bg-neutral-100 font-bold transition-colors">+</button>
                      </div>
                      <button onClick={() => removeItem(itemIndex)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto border-t border-neutral-100">
                    <table className="w-full text-left text-sm border-collapse">
                      <tbody className="divide-y divide-neutral-100">
                        {item.workingIngredients.map((ing: any, i: number) => (
                          <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-neutral-900 w-1/4">{ing.name}</td>
                            <td className="px-6 py-4 w-1/6">
                              <span className="px-2 py-1 rounded text-[9px] font-black tracking-wider uppercase bg-neutral-100 text-neutral-500">{ing.macro_tag}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-neutral-400 font-bold w-1/6">{item.previewData.ingredients[i].original_weight}g</td>
                            <td className="px-6 py-4 text-right text-[#6A0FAD] font-bold bg-[#F9F5FD] w-1/6">{item.previewData.ingredients[i].new_weight}g</td>
                            <td className="px-6 py-4 text-right w-1/4">
                              <input 
                                type="number" 
                                value={ing.new_weight.toFixed(1)}
                                onChange={(e) => handleWeightChange(itemIndex, i, e.target.value)}
                                className="w-20 text-center bg-white border border-neutral-200 rounded-lg px-2 py-1.5 font-bold text-neutral-900 focus:outline-none focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Per Item Footer */}
                  <div className="bg-white border-t border-neutral-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-8">
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Calories</div>
                        <div className="text-base font-black text-neutral-900 leading-none">{Math.round(liveTotals.cals)} <span className="text-xs text-neutral-400 font-medium">kcal</span></div>
                      </div>
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Protein</div>
                        <div className="text-base font-black text-blue-600 leading-none">{Math.round(liveTotals.pro)}g</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Carbs</div>
                        <div className="text-base font-black text-orange-600 leading-none">{Math.round(liveTotals.carb)}g</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Unit Price</div>
                      <div className="text-lg font-black text-neutral-900 leading-none">₹{liveTotals.finalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Global Floating Footer */}
        {orderItems.length > 0 && (
          <div className="shrink-0 w-full bg-[#1c1c1c] p-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 z-30 rounded-2xl mt-4 shadow-xl">
            <div>
              <div className="text-neutral-400 font-bold text-sm">Grand Total ({orderItems.length} items)</div>
              <div className="text-3xl font-black text-[#00E676]">₹{grandTotal.toFixed(2)}</div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="w-full md:w-auto px-6 py-3 bg-[#6A0FAD] hover:bg-[#5b0c96] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Approve & Create Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
