import React from "react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white">
        <header className="flex items-center justify-between mb-8">
          <div className="relative w-full max-w-md">
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search your today" 
              className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:border-neutral-400 text-sm placeholder:text-neutral-400 bg-transparent text-black"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              Notifications <span className="bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">3</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-yellow-400 overflow-hidden border border-neutral-200">
              <img src="https://i.pravatar.cc/150?img=11" alt="User Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        <div className="flex-1 bg-white">
          {/* Dashboard Content */}
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">Welcome to Probae Admin</h1>
          <p className="text-neutral-500">Select an item from the sidebar to view data.</p>
        </div>
      </div>
    </div>
  );
}
