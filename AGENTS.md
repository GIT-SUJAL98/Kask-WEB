# 🍸 KASK Liquor Mart Web — Antigravity Engineering Directives

## 1. Multi-Developer Team Context
This project is engineered by a 2-developer team using **Antigravity on two different laptops**:
- **Laptop 1 (Backend & Systems Architect)**: Owns data persistence, database schemas, security, sync engines, and API interfaces.
- **Laptop 2 (Frontend & UI/UX Specialist)**: Owns customer storefront, approval terminal, khata portals, CSS design system, and client-side interactions.

---

## 2. Strict Domain & File Boundaries

### Backend Domain (Laptop 1):
- `supabase/schema.sql`, `supabase/seed.sql`
- `sync_agent/pos_sync_agent.py`, `sync_agent/sync_config.json`, `sync_agent/requirements.txt`
- `js/api.js` (Unified API contract layer)
- `js/config.js` (Cloud credentials and operational constants)

### Frontend Domain (Laptop 2):
- `index.html` (Customer Storefront & Cart Drawer)
- `approval.html` (Owner Mobile Approval Terminal)
- `khata.html` (Credit Customer Ledger Portal)
- `track.html` (Order Tracker & QR Payment screen)
- `css/app.css` (Luxury amber/gold dark theme & responsive breakpoints)
- `js/catalog.js`, `js/cart.js`, `js/khata.js`
- `manifest.json`, `sw.js` (PWA offline caching)

---

## 3. The API Contract Protocol (`js/api.js`)

1. **Strict Abstraction**:
   - The Frontend **must never** attempt direct database connections or raw SQL.
   - All data fetching and mutations MUST occur strictly via `window.KaskAPI`:
     - `KaskAPI.fetchProducts()`
     - `KaskAPI.fetchCustomerByPhone(phone)`
     - `KaskAPI.createDraftOrder(orderPayload)`
     - `KaskAPI.subscribeToDraftOrders(callback)`
     - `KaskAPI.updateOrderStatus(orderId, status)`
2. **Offline & Seed Reliability**:
   - When developing or testing frontend features without Supabase credentials, `js/api.js` automatically falls back to `data/products_seed.json` and `data/customers_seed.json`.
   - Never break this fallback mechanism.
3. **Backward Compatibility**:
   - Backend changes to `js/api.js` must preserve existing function signatures to avoid breaking the Frontend team's in-progress features.

---

## 4. UI/UX & Design Standards (Frontend Guidelines)
- **Palette**: Luxury dark aesthetic (`#0b0d10`, `#13161c`, `#1c222c`) accented with rich amber / gold (`#f59e0b`, `#d97706`).
- **Responsive**: Mobile-first design for smartphones (375px+), tablets (768px+), and desktop (1024px+).
- **Feedback**: Instant visual and audio feedback (chime on new approval drafts, haptic/ripple feedback on buttons, loading skeletons).
- **Statutory Rules**: Maintain 18+ age gate compliance and curfew notice (9:30 PM cutoff) as required by local Nepal liquor regulations.
