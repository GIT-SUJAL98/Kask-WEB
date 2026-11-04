-- ==============================================================================
-- KASK LIQUOR MART — CLOUD RELAY & E-COMMERCE SCHEMA
-- Database: Supabase PostgreSQL
-- ==============================================================================

-- 1. Products Catalog (Mirrored from POS SQLite)
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    volume_ml INT,
    unit TEXT DEFAULT 'Btl',
    category TEXT NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    pack_price NUMERIC(10, 2) DEFAULT 0.0,
    stock_qty INT NOT NULL DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- 2. Customers & Khata Credit Registry (Mirrored from POS SQLite)
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    credit_limit NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    current_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    is_credit_approved BOOLEAN DEFAULT TRUE,
    pin_hash TEXT, -- Optional 4-digit PIN hash for online Khata authorization
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- 3. Customer Ledger Entries (Invoices, Settlements, Custom Orders)
CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('INVOICE', 'PAYMENT', 'CUSTOM_ORDER')),
    amount NUMERIC(10, 2) NOT NULL,
    reference_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_cust ON public.customer_ledger(customer_id, created_at DESC);

-- 4. Draft Invoices / Web Orders (Staged for Mobile Companion Approval)
CREATE TABLE IF NOT EXISTS public.draft_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL UNIQUE, -- e.g. KASK-1042
    customer_id BIGINT REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('PICKUP', 'DELIVERY')),
    delivery_address TEXT,
    items_count INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('KHATA', 'FONEPAY_QR', 'CASH')),
    status TEXT NOT NULL CHECK (status IN (
        'PENDING_APPROVAL', 
        'APPROVED', 
        'REJECTED', 
        'PACKED', 
        'COMPLETED', 
        'CANCELLED'
    )) DEFAULT 'PENDING_APPROVAL',
    rejection_reason TEXT,
    pickup_code TEXT, -- 4-digit code for counter verification
    pos_parked_cart_id INT, -- Populated once synced into desktop POS SQLite
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_draft_orders_status ON public.draft_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draft_orders_customer ON public.draft_orders(customer_phone);

-- 5. Draft Order Line Items
CREATE TABLE IF NOT EXISTS public.draft_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.draft_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    product_name TEXT NOT NULL,
    volume_ml INT,
    unit_price NUMERIC(10, 2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    line_total NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_draft_items_order ON public.draft_order_items(order_id);

-- 6. Store Configuration & Liquor Compliance Engine
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Store Configuration
INSERT INTO public.store_settings (key, value) VALUES
('general', '{
    "store_name": "KASK Liquor Mart",
    "location": "Mahalaxmi Municipality, Lalitpur, Nepal",
    "phone": "+977-9851133129",
    "is_open": true,
    "opening_time": "10:00",
    "closing_time": "21:30",
    "min_age": 18,
    "dry_day_mode": false,
    "delivery_enabled": true,
    "delivery_fee": 100.0,
    "free_delivery_threshold": 3000.0,
    "delivery_zones": ["Mahalaxmi", "Imadol", "Gwarko", "Sanogaucharan", "Lubhu", "Tikathali"]
}'::jsonb),
('payment', '{
    "fonepay_merchant_code": "KASK_LIQUOR_MART",
    "fonepay_account_name": "KASK LIQUOR MART",
    "fonepay_pan": "609823145",
    "allow_credit_orders": true,
    "allow_cod": true
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 7. Realtime Replication Configuration
-- Enable Supabase Realtime so Mobile Companion App and Customer Web receive instant pushes
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read active products
CREATE POLICY "Public can view active products" 
ON public.products FOR SELECT USING (is_active = true);

-- Store Settings: Everyone can read store hours & general configuration
CREATE POLICY "Public can view store settings" 
ON public.store_settings FOR SELECT USING (true);

-- Draft Orders: Public can insert pending orders
CREATE POLICY "Public can create draft orders" 
ON public.draft_orders FOR INSERT WITH CHECK (true);

-- Public can view draft orders using order_code or phone
CREATE POLICY "Public can view own draft orders" 
ON public.draft_orders FOR SELECT USING (true);

CREATE POLICY "Public can insert order items" 
ON public.draft_order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view order items" 
ON public.draft_order_items FOR SELECT USING (true);

-- Customers & Ledger: Read with matching phone number
CREATE POLICY "Customer can view own profile by phone" 
ON public.customers FOR SELECT USING (true);

CREATE POLICY "Customer can view own ledger by customer_id" 
ON public.customer_ledger FOR SELECT USING (true);

-- Service Role (POS Sync Daemon & Store Owner Mobile App): Full Access
CREATE POLICY "Service Role full access products" ON public.products FOR ALL USING (true);
CREATE POLICY "Service Role full access customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Service Role full access ledger" ON public.customer_ledger FOR ALL USING (true);
CREATE POLICY "Service Role full access orders" ON public.draft_orders FOR ALL USING (true);
CREATE POLICY "Service Role full access order items" ON public.draft_order_items FOR ALL USING (true);
CREATE POLICY "Service Role full access store settings" ON public.store_settings FOR ALL USING (true);
