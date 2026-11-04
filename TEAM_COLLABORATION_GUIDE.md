# 🤝 KASK Web — 2-Laptop Team Collaboration Guide

This document outlines the workflow, file boundaries, and Git strategy for the two-person engineering team building **KASK Liquor Mart Web**.

---

## 👥 The Team & Laptop Roles

| Member | Machine | Role | Focus Area |
| :--- | :--- | :--- | :--- |
| **Developer 1 (You)** | **Laptop 1** | **Backend & Systems Architect** | Supabase database, RLS security, POS SQLite sync daemon, data contract (`js/api.js`), cloud credentials. |
| **Developer 2 (Friend)** | **Laptop 2** | **Lead UI/UX & Frontend Engineer** | Storefront PWA, Mobile Approval Terminal, Khata Ledger, Order Tracker, responsive CSS styling, animations. |

---

## 📂 File Ownership Matrix (Conflict Prevention)

To prevent Git merge conflicts, strictly adhere to these file boundaries:

| Directory / File | Owner | Description |
| :--- | :--- | :--- |
| `index.html` | **Frontend** | Customer storefront & product catalog |
| `approval.html` | **Frontend** | Owner companion approval terminal |
| `khata.html` | **Frontend** | Credit customer ledger portal |
| `track.html` | **Frontend** | Real-time order tracker & FonePay/NepalQR screen |
| `css/app.css` | **Frontend** | Luxury dark theme, amber accents, responsive rules |
| `js/catalog.js` | **Frontend** | Product rendering, filtering, search UI logic |
| `js/cart.js` | **Frontend** | Cart drawer, delivery calculations, draft submission UI |
| `js/khata.js` | **Frontend** | Khata customer statement rendering |
| `manifest.json`, `sw.js` | **Frontend** | PWA offline caching & service worker |
| `supabase/*` | **Backend** | SQL schemas, tables, RLS security policies, seed scripts |
| `sync_agent/*` | **Backend** | Python desktop POS daemon syncing SQLite `pos_data.db` to cloud |
| `js/api.js` | **Backend** *(Contract)* | Unified API data layer (`window.KaskAPI`) |
| `js/config.js` | **Backend** | Cloud credentials, business hours, delivery boundaries |

---

## 🔌 The API Contract (`js/api.js`)

`js/api.js` is the **bridge** between Backend and Frontend.

1. **Frontend never writes raw SQL or talks directly to Supabase.** All data requests go through `window.KaskAPI`:
   - `KaskAPI.fetchProducts()`
   - `KaskAPI.fetchCustomerByPhone(phone)`
   - `KaskAPI.createDraftOrder(orderPayload)`
   - `KaskAPI.subscribeToDraftOrders(callback)`
   - `KaskAPI.updateOrderStatus(orderId, status)`
2. **Offline Seed Fallback:** If Supabase credentials in `js/config.js` are empty, `js/api.js` automatically uses [`data/products_seed.json`](file:///data/products_seed.json) and [`data/customers_seed.json`](file:///data/customers_seed.json).
3. **Parallel Velocity:** The Frontend team on Laptop 2 can develop, test, and style the entire website immediately without needing live backend or POS hardware connected.

---

## 🚀 Laptop 2 Setup (For Your Friend)

Give these exact steps to your friend to set up their laptop:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GIT-SUJAL98/Kask-WEB.git
   cd Kask-WEB
   ```
2. **Create their working branch:**
   ```bash
   git checkout -b frontend-dev
   ```
3. **Launch the local preview server:**
   ```bash
   python -m http.server 8080
   ```
4. Open the browser to:
   - Storefront: `http://localhost:8080/index.html`
   - Approval Terminal: `http://localhost:8080/approval.html`
   - Khata Portal: `http://localhost:8080/khata.html`
   - Order Tracker: `http://localhost:8080/track.html`

---

## 🌿 Git Branch & Synchronization Workflow

### Daily Routine for Both Developers:

1. **Start of day:** Pull latest changes from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout <your-branch>
   git merge main
   ```

2. **Laptop 1 (Backend - You):**
   - Work strictly on branch: `backend-dev`
   - Committing:
     ```bash
     git add supabase/ sync_agent/ js/api.js
     git commit -m "feat(backend): add RLS policies for draft_orders"
     git push origin backend-dev
     ```

3. **Laptop 2 (Frontend - Friend):**
   - Work strictly on branch: `frontend-dev`
   - Committing:
     ```bash
     git add index.html approval.html css/ js/cart.js
     git commit -m "style(frontend): polish cart drawer checkout animations"
     git push origin frontend-dev
     ```

4. **Merging into `main`:**
   - Either merge via GitHub Pull Request or merge locally:
     ```bash
     git checkout main
     git pull origin main
     git merge frontend-dev  # or backend-dev
     git push origin main
     ```

---

## 🤖 Antigravity Prompts for Each Laptop

Copy and paste these prompts into Antigravity on the respective machines to set their context:

### Prompt for Laptop 1 (Backend - You):
> "I am the Backend & Systems Engineer on Laptop 1 for KASK Liquor Mart. My responsibilities cover `supabase/schema.sql`, `supabase/seed.sql`, `sync_agent/pos_sync_agent.py`, `js/api.js`, and `js/config.js`. Please ensure database transactions, SQLite WAL synchronization with our Lubuntu/Windows desktop POS, Supabase Row-Level Security, and clear API method signatures for the frontend team."

### Prompt for Laptop 2 (Frontend - Friend):
> "I am the Lead Frontend & UI/UX Engineer on Laptop 2 for KASK Liquor Mart. My responsibilities cover `index.html`, `approval.html`, `khata.html`, `track.html`, `css/app.css`, and UI scripts (`catalog.js`, `cart.js`, `khata.js`). Ensure mobile-first responsive design, 60fps animations, the dark luxury amber aesthetic, and access data strictly through the existing `window.KaskAPI` methods without modifying backend schemas directly."
