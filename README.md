# 🍸 KASK Liquor Mart — Web Storefront & Khata Portal

High-performance, mobile-first e-commerce catalog, Khata credit customer portal, and staged draft invoicing system engineered for **KASK Liquor Mart** (Mahalaxmi Municipality, Lalitpur, Nepal).

Integrated directly with the store's **Lubuntu/Windows Desktop POS** (`PyQt6` + `SQLite WAL`) and Android Companion App.

---

## 🚀 Key Features

1. **🥃 Customer Spirits & Beer Catalog:**
   - Real-time catalog populated directly from the store register (134+ active items: Single Malt, Blended Whiskey, Craft Beer, Wine, Cigarettes, Soft Drinks).
   - Category filtering, instant search, bottle volume badges, and stock availability chips (*In Stock, Low Stock, Counter Priority*).
2. **📲 Draft Invoicing & Mobile App Approval Gate:**
   - Orders do **not** blindly charge or lock counter stock.
   - Submitted carts arrive as interactive draft invoices on the owner's mobile device (`approval.html` / Android companion APK) with an audible chime alert.
   - Owner verifies shelf stock, makes adjustments if needed, and taps **Approve**.
   - Approved orders flow automatically into the desktop POS's `parked_carts` table, ready to ring up and print receipt in 1 second using the register's <kbd>F9</kbd> key.
3. **📓 Khata (Credit) Customer Portal (`khata.html`):**
   - Regular B2B and loyalty credit customers (e.g. Suman Bhandari, Kamal Bhandari, Rowan) can log in via registered phone number.
   - Displays real-time **Credit Limit**, **Current Due Balance**, and **Available Credit**.
   - Live transaction ledger (past purchase invoices, settlements, and custom snacks).
   - Direct online Khata settlement via dynamic NepalQR.
4. **⚖️ Nepal Liquor Regulation Compliance ("And Also..."):**
   - **Statutory 18+ Age Gate** adhering to the *Nepal Liquor Act 2031 (1974)* with ID disclaimer.
   - **Store Operating Hours & Curfew Engine:** Automatically switches to *"Next-Day Pre-Orders"* past 9:30 PM.
   - **Fulfillment Engine:** Free In-Store Counter Pickup (generates 4-digit verification code) or Lalitpur Geofenced Delivery.
   - **Dynamic FonePay / NepalQR (EMVCo Tag 54/62):** Generates exact-amount payment QR codes on approval.
   - **Instant WhatsApp Link:** Direct 1-click status checking with pre-filled order reference.

---

## 📁 Project Architecture

```
KASK Web/
├── index.html                   # Customer Storefront, Catalog & Cart Drawer PWA
├── khata.html                   # Credit Customer Ledger & Statement Portal
├── track.html                   # Live Order Lifecycle Tracker & Dynamic QR Payment
├── approval.html                # Owner Mobile Companion Approval Terminal
├── manifest.json                # PWA App Manifest
├── sw.js                        # Offline Service Worker
│
├── css/
│   └── app.css                  # Dark luxury styling with amber/gold accents
│
├── js/
│   ├── config.js                # Cloud credentials, store hours, and delivery zones
│   ├── api.js                   # Unified data layer (Supabase Cloud + Local Seed Fallback)
│   ├── catalog.js               # Product catalog, category filter & search controller
│   ├── cart.js                  # Shopping cart, fulfillment, and draft order engine
│   └── khata.js                 # Khata authentication and ledger renderer
│
├── data/
│   ├── products_seed.json       # 134 real products exported from pos_data.db
│   └── customers_seed.json      # 31 real Khata credit customers from pos_data.db
│
├── supabase/
│   ├── schema.sql               # PostgreSQL tables, RLS security policies, and Realtime
│   └── seed.sql                 # SQL insert statements for instant cloud bootstrapping
│
└── sync_agent/
    ├── pos_sync_agent.py        # Python SQLite-to-Cloud bidirectional sync daemon
    ├── sync_config.json         # Agent settings and POS DB file path
    └── requirements.txt         # requests package
```

---

## ⚡ Quick Start & Local Testing

### 1. Launch the Web Application
No build tools or Node.js required! You can serve it using Python's built-in web server:

```bash
# In the KASK Web folder:
python -m http.server 8080
```
Open your browser to:
- **Customer Storefront:** `http://localhost:8080/index.html`
- **Khata Credit Portal:** `http://localhost:8080/khata.html`
- **Owner Mobile Approval Terminal:** `http://localhost:8080/approval.html`

### 2. Testing the End-to-End Order Flow:
1. Open `http://localhost:8080/approval.html` in one tab (or on your phone). Make sure **Audio Alert** is ON.
2. In another tab, open `http://localhost:8080/index.html`. Add a bottle of Glenfiddich and Tuborg Beer to your cart.
3. Open the Cart, enter phone `9851133129`, and click **"Send Draft to Store for Approval"**.
4. Hear the chime ring in the Approval tab! Inspect the customer's Khata details and tap **"Approve & Park in POS Till"**.
5. The customer's tracking screen instantly updates to **Approved**, displaying the 4-digit pickup code or dynamic payment QR!

---

## ☁️ Connecting Supabase for 24/7 Cloud Sync

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and paste the contents of `supabase/schema.sql`, then click **Run**.
3. (Optional) Run `supabase/seed.sql` to populate initial products and customers in the cloud.
4. Open `js/config.js` and paste your project URL and anon public key:
   ```javascript
   SUPABASE_URL: "https://xyzcompany.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   ```
5. Open `sync_agent/sync_config.json` and paste your credentials.
6. Run the background sync daemon on your shop PC:
   ```bash
   python sync_agent/pos_sync_agent.py --daemon
   ```
   *The daemon will continuously push stock changes from `pos_data.db` to Supabase and pull approved web orders directly into your POS register's parked carts!*
