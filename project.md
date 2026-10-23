# ProBae Frontend — Comprehensive Project Documentation (`project.md`)

> **File Path**: `probae_front/project.md`  
> **Last Updated**: October 2026  
> **Target Audience**: AI Agents, Systems Engineers, and Full-Stack Developers.  
> **Purpose**: This document provides an exhaustive, authoritative blueprint of the entire ProBae frontend application. Any future developer or AI model reading this file must be able to understand the full system architecture, layout guidelines, component structure, state management, API service layer, routing rules, and design conventions to maintain and extend the codebase without missing context.

---

## 1. Project Overview & Tech Stack

ProBae is a modern, high-performance web platform designed for personalized, tiered nutrition meal prep, subscription management, kitchen display system (KDS) operations, delivery logistics, and business financial settlements.

### 1.1 Core Technologies
- **Framework**: Next.js 16.2.6 (App Router)
- **UI Runtime**: React 19.2.4
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Icons**: Lucide React (`lucide-react`)
- **Mapping**: Leaflet 1.9.4 & React-Leaflet 5.0.0
- **Animations & Effects**: Framer Motion 13.4, GSAP 3.15, Lenis (smooth scrolling)
- **Utilities**: XLSX 0.18.5 (Excel export), QRCode.react 4.2.0 (QR code rendering / 2FA)

### 1.2 Brand Identity & Palette
- **ProBae Purple**: `#6A0FAD` / `hover: #5a0d93` (Primary brand accent, main CTAs, active highlights)
- **Nutrition Green**: `#16A34A` / `emerald-600` (Core bowl identifiers, positive balances, active tags)
- **Warm Orange**: `#F97316` (Attention badges, warnings, secondary action buttons)
- **Gold Accent**: `#FFD700` (Highlights, "Most Nutrient Dense" badges, premium markers)
- **Dark Neutral Surfaces**: `#1c1c1c` / `#1a1a1a` / `neutral-900` (Cards, sidebars, modals)
- **Light Neutral Surfaces**: `#fafafa` / `#f3f4f6` / `neutral-100` (Page canvas, input backgrounds)

---

## 2. Directory Structure & Architecture

```
probae_front/
├── app/                              # Next.js App Router root
│   ├── admin/                        # Admin Portal (Role: ADMIN, STAFF)
│   │   ├── accounts/                 # Accounting overview
│   │   ├── affiliates/               # Affiliate & referral program
│   │   ├── bowls/                    # Bowl menu management
│   │   │   ├── builder/[ulid]/       # Interactive bowl builder & macro calculator
│   │   │   ├── categories/           # Bowl category lists & previews
│   │   │   ├── meal-categories/      # Meal slots (Breakfast, Lunch, Dinner, Snacks)
│   │   │   └── preview/[ulid]/       # Live preview of bowl recipe & macros
│   │   ├── customers/                # Customer relationship management (CRM)
│   │   │   ├── [ulid]/               # Customer profile, health metrics, wallet & schedule
│   │   │   ├── new/                  # Manual customer onboarding
│   │   │   └── transactions/         # Global wallet deposits, debits & refunds
│   │   ├── dashboard/                # Main admin command center (Financials, Orders, KDS)
│   │   ├── delivery/                 # Delivery operations & dispatching
│   │   │   ├── agents/               # Driver directory, vehicle details & assignments
│   │   │   ├── dashboard/            # Real-time logistics KPI dashboard
│   │   │   ├── today/                # Route optimization & live delivery tracking
│   │   │   └── zones/                # Polygon-based delivery zones map (Leaflet)
│   │   ├── dispatch/                 # Order dispatch stage & label printing
│   │   ├── enquiries/                # Inbound leads & customer enquiries
│   │   │   └── [ulid]/               # Lead detail, follow-up notes & conversion
│   │   ├── expenses/                 # Expense tracking & financial reconciliation
│   │   │   ├── categories/           # Expense categories with monthly budgets & requirements
│   │   │   ├── dashboard/            # Comprehensive expense analysis & charts
│   │   │   ├── logs/                 # Tabular expense logs with receipt links
│   │   │   └── settlements/          # User settlements (payment_to vs sent_from reconciliation)
│   │   ├── ingredients/              # Intermediate recipe components & prep yields
│   │   ├── kds/                      # Kitchen Display System (5-stage line)
│   │   │   ├── procurement/          # Daily raw material purchase requirements
│   │   │   ├── prep/                 # Batch vegetable/protein preparation station
│   │   │   ├── assembly/             # Individual bowl weighing & assembly line
│   │   │   ├── packaging/            # Bagging, labeling, and condiment packaging
│   │   │   └── dispatch/             # Driver hand-off & final dispatch staging
│   │   ├── login/                    # Secure Admin/Staff authentication portal
│   │   ├── message-templates/        # WhatsApp / SMS notification template builder
│   │   ├── orders/                   # Order management
│   │   │   ├── [ulid]/               # Order detail & item-level breakdown
│   │   │   ├── batch-adjust/         # Bulk schedule adjustments & pause handling
│   │   │   ├── daily-bowls/          # Today's production quantity breakdown
│   │   │   └── new/                  # Manual order creation modal
│   │   ├── packaging/                # Packaging inventory & bundle sets
│   │   │   ├── bundles/              # Box + container packaging sets
│   │   │   └── components/           # Individual bowls, lids, spoons, stickers
│   │   ├── plans/                    # Nutrition plan subscription builder
│   │   │   ├── builder/              # Multi-tier plan generator (Core vs Pro)
│   │   │   └── menu-blueprint/       # 4-week menu rotation blueprint
│   │   ├── profile/                  # Admin user settings, security & 2FA
│   │   ├── raw-materials/            # Supply chain management
│   │   │   ├── calorie-management/   # Raw ingredient macro definitions
│   │   │   ├── categories/           # Protein, Produce, Dairy, Spices categories
│   │   │   ├── cost-management/      # Vendor price fluctuations & standard vs actual costs
│   │   │   ├── purchase-history/     # Historical purchase logs & invoices
│   │   │   ├── stock/                # Current stock levels, min-thresholds & reorder alerts
│   │   │   └── vendors/              # Approved supplier directory
│   │   ├── settings/                 # Global system configuration (KITCHEN_OFF, PAYMENT_RECIPIENTS)
│   │   ├── subscriptions/            # Active recurring subscription management
│   │   ├── transactions/             # Global transaction dashboard & ledger
│   │   └── users/                    # System user management (Admins, Kitchen Staff, Drivers)
│   ├── delivery/                     # Delivery Driver PWA Portal
│   │   ├── login/                    # Mobile driver login
│   │   ├── profile/                  # Driver vehicle, shift & performance
│   │   └── page.tsx                  # Driver active run sheet & navigation view
│   ├── landing/                      # Public promotional landing page
│   ├── menu/                         # Interactive customer-facing nutritional menu
│   ├── plans/                        # Public subscription plans & enquiry modal
│   ├── onboarding/                   # Public customer onboarding flow
│   └── page.tsx                      # Main public homepage
├── components/                       # Reusable React UI Components
│   ├── ConfirmationModal.tsx         # Unified animated confirmation dialog (Replaces native alerts)
│   ├── LoginForm.tsx                 # High-security authentication form with 2FA TOTP support
│   ├── ProbaeButton.tsx              # Universal styled button component
│   ├── Providers.tsx                 # Top-level client providers wrapper (AuthProvider)
│   ├── PwaRegister.tsx               # Service Worker registrar for PWA capabilities
│   ├── RotatingImageBanner.tsx       # Smooth image carousel for marketing screens
│   ├── admin/                        # Admin domain components
│   │   ├── AdminLayoutClient.tsx     # Shell layout containing Sidebar, Header & Breadcrumbs
│   │   ├── AffiliatePreviewModal.tsx # Side-by-side affiliate cost vs referral revenue preview
│   │   ├── AssignAffiliateModal.tsx  # Customer affiliate status assignment modal
│   │   ├── AssignCustomerToAffiliateModal.tsx # Referral attribution modal connecting customer to affiliate
│   │   ├── AsyncBowlSelect.tsx       # Searchable asynchronous bowl picker
│   │   ├── AsyncCustomerSelect.tsx   # Searchable asynchronous customer picker
│   │   ├── AsyncExpenseCategorySelect.tsx # Category picker for expenses
│   │   ├── BowlCustomizerModal.tsx   # Modal for adjusting bowl weights, macros and extras
│   │   ├── CustomScheduleBuilder.tsx # Complex calendar matrix for customer meal plans
│   │   ├── CustomerCalories.tsx      # Daily/Weekly macro consumption breakdown
│   │   ├── CustomerHistory.tsx       # Customer transaction & meal order log
│   │   ├── Header.tsx                # Admin header with notifications & user profile pill
│   │   ├── LeafletMap.tsx            # Dynamic OpenStreetMap wrapper
│   │   ├── OrderWindowModal.tsx      # Cut-off window timing manager
│   │   ├── Sidebar.tsx               # Primary responsive admin sidebar navigation
│   │   ├── SubscriptionSidePanel.tsx # Drawer for rapid subscription adjustments
│   │   ├── TwoFactorSetup.tsx        # QR code generator and OTP verification modal
│   │   └── ZonePolygonMap.tsx        # Polygon drawing interface for logistics zones
│   └── user/                         # Customer & public web components
│       ├── BottomNav.tsx             # Mobile-first floating bottom navigation
│       ├── BowlCard.tsx              # Macro-dense interactive bowl display card
│       ├── BowlModal.tsx             # Pop-up detail with ingredient allergens & macros
│       ├── EnquiryModal.tsx          # Fast enquiry submission modal with plan prefill
│       ├── Header.tsx                # Public navigation header
│       ├── MenuClientSection.tsx     # Filterable menu list with calorie sliders
│       ├── PlanCard.tsx              # Core vs Pro subscription presentation cards
│       └── ThemeWrapper.tsx          # Consistent background canvas provider
├── context/                          # React context providers
├── lib/                              # Core utilities, API clients & type definitions
│   ├── apiService.ts                 # Centralized Axios/Fetch API client with JWT refresh queue
│   ├── customerApiService.ts         # Customer-specific endpoints
│   ├── sidebarConfig.ts              # Hierarchical navigation registry and RBAC definitions
│   ├── timeUtils.ts                  # Indian Standard Time (IST) formatting & relative dates
│   ├── types.ts                      # Full TypeScript interfaces and schema contracts
│   └── utils.ts                      # Tailwind class merging (clsx + twMerge)
└── public/                           # Static assets, logos, icons, PWA manifests
```

---

## 3. Layout Conventions & Responsive Design Rules

### 3.1 The Scrollable Card Pattern (MANDATORY)
To prevent scrollbar jitter and broken multi-column layouts across desktop and mobile devices, all administrative view pages MUST adhere to the following hierarchy:

1. **Outer Viewport Container**:
   ```tsx
   <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] overflow-hidden bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
   ```
2. **Fixed Header Section**:
   ```tsx
   <div className="shrink-0 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
     {/* Title, Search, Primary Actions */}
   </div>
   ```
3. **Inner Scrollable Content Container**:
   ```tsx
   <div className="overflow-y-auto min-h-0 flex-1 space-y-6 pb-20 pr-1 scrollbar-thin scrollbar-thumb-neutral-700">
     {/* ALL direct children MUST include `shrink-0` to prevent vertical compression */}
     <div className="shrink-0 bg-neutral-800 rounded-xl p-5 border border-neutral-700">
       {/* Content */}
     </div>
   </div>
   ```

### 3.2 Responsive Table & Grid Rules
- **Horizontal Overflow Wrapper**: Every table MUST be wrapped in `<div className="w-full overflow-x-auto">`.
- **Minimum Table Width**: Data tables must specify an explicit minimum width (e.g. `<table className="w-full min-w-[650px] text-left">`) to prevent columns from collapsing on small screens.
- **Responsive Form & Metric Grids**: Never hardcode fixed columns like `grid-cols-3` without mobile fallbacks. Always use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`.
- **Button Shrinkage**: Filter and action buttons inside flex rows must include `shrink-0` and explicit minimum height (e.g., `min-h-[44px]` or `min-h-[56px]`) so text does not wrap or deform.

### 3.3 Modal and Dialog Standard
Never use browser-native `window.confirm()` or `window.alert()`. Use the custom `<ConfirmationModal />` component located at `components/ConfirmationModal.tsx`, which features:
- Dark glass backdrop (`backdrop-blur-sm bg-black/60`).
- Destructive vs Info variant styling (`#EF4444` red vs `#6A0FAD` purple).
- Keyboard ESC support and animated entry.

---

## 4. Authentication, Authorization & Security

### 4.1 In-Memory Access Token + HttpOnly Refresh Token
The application utilizes an enterprise-grade dual-token authentication pattern:
1. **Access Token**: Stored strictly in memory (`setMemoryAccessToken` in `lib/apiService.ts`). Never persisted to `localStorage` or `sessionStorage` to mitigate Cross-Site Scripting (XSS) token theft.
2. **Refresh Token**: Issued as a secure `HttpOnly`, `SameSite=Lax`, `Secure` cookie by the FastAPI backend (`refresh_token`).
3. **Seamless Auto-Refresh Queue**:
   When any API request encounters an HTTP `401 Unauthorized`, `apiService.ts` intercepts the response:
   - Queues incoming failed requests into a retry array.
   - Issues a single `POST /api/v1/auth/refresh` request with `credentials: 'include'`.
   - Upon receiving a fresh access token, updates the memory store and replays all queued requests seamlessly.
   - If the refresh token has expired or is invalid, redirects the user cleanly to `/admin/login` or `/delivery/login`.

### 4.2 Role-Based Access Control (RBAC)
Role definitions:
- `ADMIN`: Unrestricted access across all domains, financial metrics, settlements, settings, and logs.
- `STAFF`: Kitchen staff access restricted to KDS operations (Procurement, Prep, Assembly, Packaging, Dispatch).
- `DELIVERY`: Driver access restricted to the Driver Portal (`/delivery`), assigned orders, and route navigation.
- `CUSTOMER`: Public ordering and subscription profiles.

Role configuration is centralized in `lib/sidebarConfig.ts`. The `Sidebar.tsx` component automatically filters menu items against `user.role` from `AuthContext.tsx`.

---

## 5. Timezone Standard: Indian Standard Time (IST)

> **CRITICAL RULE**: ProBae operates in India (`Asia/Kolkata`, UTC+5:30).  
> All date calculations, daily cut-offs, order day assignments, and monthly financial balance aggregations MUST strictly calculate based on IST.

### 5.1 Rules for Frontend Date Handling
1. **Do not use `new Date().toISOString()` directly for local day calculations**, as this returns UTC and causes date shifts between 12:00 AM and 5:30 AM IST.
2. **Format Dates with `timeZone: 'Asia/Kolkata'`**:
   ```ts
   const nowIST = new Intl.DateTimeFormat('en-CA', {
     timeZone: 'Asia/Kolkata',
     year: 'numeric',
     month: '2-digit',
     day: '2-digit',
   }).format(new Date()); // Formats as YYYY-MM-DD in IST
   ```
3. Relative time displays must use `formatTimeAgo()` from `lib/timeUtils.ts`.

---

## 6. Key Frontend Feature Modules

### 6.1 Admin Dashboard (`/admin/dashboard`)
The central operations screen features:
- **Real-Time KPI Cards**: Today's delivered orders, active subscription count, customer retention %, and today's gross revenue.
- **Monthly Financial Balance Card**: A custom 3-section financial widget:
  - **Top Half**: Total Profit for the current month (`Revenue - Expenses`) with a dynamic profit margin % badge.
  - **Bottom Left**: Total Revenue (includes product price, delivery charges, and item `fixed_cost` on delivered orders).
  - **Bottom Right**: Total Explicit Expenses + Raw Material Purchases.
  - **Footer Equation**: `Revenue ₹X.XX - Expense ₹Y.YY = Net Profit ₹Z.ZZ`.
- **Order Distribution**: Breakdown of Core Standard vs Custom Macro bowls.
- **Kitchen Status Toggle**: Instant operational toggle to open or close the kitchen (`is_kitchen_off`), preventing automatic order generation.

### 6.2 Customer Detail & Schedule Matrix (`/admin/customers/[ulid]`)
- **Profile & Health Data**: Customer BMR, TDEE, target calories, macro splits (protein/carbs/fat/fiber), and medical dietary restrictions.
- **Interactive Calendar Matrix (`CustomScheduleBuilder.tsx`)**:
  - Full weekly/monthly grid displaying scheduled bowls for Breakfast, Lunch, and Dinner.
  - One-click bowl swapping via `AsyncBowlSelect`.
  - Pause / Resume customer meal deliveries.
  - Live preview of scaled recipe quantities and customer specific custom bowls.
- **Wallet & Payment Logging**:
  - Displays real-time prepaid balance.
  - "Log Payment" form: records deposit amount, payment method (UPI, Bank Transfer, Cash), date, reference ID, and **"Payment To"** recipient from system settings.

### 6.3 Expense Management & Settlements (`/admin/expenses`)
- **Expense Categories (`/admin/expenses/categories`)**:
  - List and modal management for expense heads.
  - Fields: `name`, `description`, `monthly_budget`, and `requirement` (text explanation of why the expense exists and budget rules).
- **Expense Logs (`/admin/expenses/logs`)**:
  - Detailed expense records with category tagging, payment date, notes, and the person who paid (`sent_from`).
  - Supports single entry and multi-line batch entry (`BulkExpenseModal.tsx`).
- **User Settlements (`/admin/expenses/settlements`)**:
  - Financial reconciliation reconciling two sides of the same team members:
    1. **Customer Payments Received (`payment_to`)**: Money collected into the user's personal/business account.
    2. **Expenses Paid (`sent_from`)**: Out-of-pocket operational costs paid by the user.
  - Calculates Net Balance: `Total Income - Total Expense`.
  - Visual Status Badges:
    - `BALANCED`: Diff is ₹0.00.
    - `SURPLUS`: User holds excess company funds to be remitted (`#16A34A`).
    - `DEFICIT`: Company owes user reimbursement for out-of-pocket expenses (`#EF4444`).
  - Detailed drill-down modal showing granular transaction lists and receipts.

### 6.4 Affiliate Management & Cost/Revenue Reconciliation (`/admin/affiliates`)
- **Affiliate Overview & Referral Assignment**:
  - Ability to designate customer accounts as affiliates and assign any customer to an affiliate partner directly from the page (`AssignCustomerToAffiliateModal.tsx`).
  - Top KPI cards tracking Active Affiliates, Total Referred Customers, and Total Received from Referrals.
- **Affiliate Preview Modal (`AffiliatePreviewModal.tsx`)**:
  - **Affiliate's Own Food & Plan Cost**:
    - Disaggregates total order/plan price into:
      1. **Fixed Price**: Kitchen overhead, preparation baseline (`fixed_price`).
      2. **Raw Material + Packaging Price**: Sum of raw food ingredients + packaging containers.
    - Compares planned subscription costs against executed daily orders.
  - **Referred Customers & Revenue**:
    - Aggregates total cash deposits/payments received from customers registered under this affiliate.
    - Lists all individual referred customers, active plans, order volumes, and individual payment totals.
    - Provides one-click action to unassign or assign new customers.
  - **Net Balance & ROI**:
    - Direct equation: `Total Received from Referrals - Total Affiliate Food Cost = Net Profit Margin`.

### 6.5 Public Web Experience (`/`, `/menu`, `/plans`)
- **Nutritional Menu (`/menu`)**:
  - Live filtering by dietary type (High Protein, Keto, Balanced, Vegan).
  - Dynamic calorie range slider.
  - Pop-up nutritional facts label with macro breakdown.
- **Subscription Plans (`/plans`)**:
  - Tiered plan selector: **Core** (Green `#16A34A`) vs **Pro** (Purple `#6A0FAD`).
  - Highlights included meal slots (Breakfast, Lunch, Dinner).
  - One-click CTA opening `<EnquiryModal />` prefilled with the chosen plan name.

---

## 7. API Service Architecture (`lib/apiService.ts`)

All network communication with the backend is centralized in `lib/apiService.ts`.  
Endpoints are organized into namespaced domain objects:

| Domain Namespace | Key Methods & Purpose |
| :--- | :--- |
| `endpoints.auth` | `login()`, `logout()`, `refreshToken()`, `setup2fa()`, `verify2fa()` |
| `endpoints.users` | `getMe()`, `listUsers()`, `createUser()`, `updateUser()`, `deleteUser()` |
| `endpoints.customers` | `list()`, `get(ulid)`, `create()`, `update()`, `getSchedule()`, `saveSchedule()`, `getAffiliatePreview()`, `assignReferral()`, `unassignReferral()` |
| `endpoints.bowls` | `list()`, `get(ulid)`, `create()`, `update()`, `calculateMacros()`, `delete()` |
| `endpoints.plans` | `list()`, `get(ulid)`, `create()`, `update()`, `getBlueprint()`, `saveBlueprint()` |
| `endpoints.orders` | `list()`, `get(ulid)`, `create()`, `updateStatus()`, `getDailyBowls()` |
| `endpoints.kds` | `getProcurement()`, `getPrep()`, `getAssembly()`, `getPackaging()`, `getDispatch()` |
| `endpoints.expenses` | `list()`, `create()`, `bulkCreate()`, `listCategories()`, `saveCategory()`, `getSettlements()`, `getSettlementDetails()` |
| `endpoints.transactions` | `list()`, `logPayment()`, `getDashboardStats()` |
| `endpoints.logistics` | `listZones()`, `saveZone()`, `listDrivers()`, `assignDriver()`, `getLiveRun()` |
| `endpoints.settings` | `getAll()`, `update()`, `getPaymentRecipients()` |
| `endpoints.enquiries` | `list()`, `updateStatus(ulid, status)`, `delete(ulid)` |
| `endpoints.public` | `getMenu()`, `getPlans()`, `submitEnquiry()` |

---

## 8. Guidelines for Future AI Models & Developers

When introducing new features or modifying the ProBae frontend, follow these strict guidelines:

1. **Verify TypeScript Typings First**:
   Always check and update `lib/types.ts` before creating new components or API calls. Run `npx tsc --noEmit` to ensure zero compilation regressions.
2. **Preserve Responsive Layout Wrappers**:
   When modifying pages, never remove `overflow-y-auto min-h-0 flex-1` or `shrink-0` from container children.
3. **Keep All Modals Accessible & Non-Blocking**:
   Use standard props (`isOpen: boolean, onClose: () => void`). Never lock the UI without an escape or cancel route.
4. **Follow Brand Color Constants**:
   Do not introduce random shades of blue or red. Always use `#6A0FAD` for primary accents, `#16A34A` for success/core nutrition, and `#F97316` for alerts.
5. **Enforce Indian Standard Time**:
   Always handle timestamps and date selections in `Asia/Kolkata`.

*(End of `probae_front/project.md`)*
