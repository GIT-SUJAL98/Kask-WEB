/**
 * KASK LIQUOR MART — UNIFIED API & DATA LAYER
 * Handles Supabase cloud operations with automatic zero-config offline fallback.
 */

class KaskAPI {
  constructor() {
    this.config = window.KASK_CONFIG;
    this.isCloudEnabled = !!(this.config.SUPABASE_URL && this.config.SUPABASE_ANON_KEY && !this.config.SUPABASE_URL.includes("your-project"));
    this.supabaseClient = null;

    if (this.isCloudEnabled && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(
          this.config.SUPABASE_URL,
          this.config.SUPABASE_ANON_KEY
        );
        console.log("[KASK API] Connected to Supabase Cloud Relay.");
      } catch (e) {
        console.warn("[KASK API] Supabase initialization failed, using local cache:", e);
        this.isCloudEnabled = false;
      }
    } else {
      console.log("[KASK API] Running in High-Speed Local & Offline Seed Mode.");
    }
  }

  /**
   * Evaluates store operating hours and curfew compliance
   */
  getStoreStatus() {
    const now = new Date();
    const curHour = now.getHours();
    const curMin = now.getMinutes();
    const curTime = curHour + curMin / 60;

    const openTime = this.config.OPEN_HOUR;
    const closeTime = this.config.CLOSE_HOUR + this.config.CLOSE_MINUTE / 60;

    const isOpen = curTime >= openTime && curTime < closeTime;
    const isClosingSoon = isOpen && (closeTime - curTime) <= 0.5; // Within 30 mins

    return {
      isOpen,
      isClosingSoon,
      curTimeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      openTimeStr: "10:00 AM",
      closeTimeStr: "9:30 PM",
      statusLabel: isOpen 
        ? (isClosingSoon ? "Closing Soon (9:30 PM)" : "Open for Orders") 
        : "Closed (Taking Pre-Orders)",
      badgeClass: isOpen ? "status-dot" : "status-dot closed"
    };
  }

  /**
   * Fetches product catalog with fallback to seed data
   */
  async getProducts() {
    if (this.isCloudEnabled && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('name');
        if (!error && data && data.length > 0) {
          localStorage.setItem(this.config.STORAGE_KEYS.PRODUCTS, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn("[KASK API] Cloud products fetch failed, falling back to local:", e);
      }
    }

    // Try Local Cache
    const cached = localStorage.getItem(this.config.STORAGE_KEYS.PRODUCTS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    // Fetch from seed JSON file
    try {
      const res = await fetch('data/products_seed.json');
      const seedProducts = await res.json();
      localStorage.setItem(this.config.STORAGE_KEYS.PRODUCTS, JSON.stringify(seedProducts));
      return seedProducts;
    } catch (err) {
      console.error("[KASK API] Could not load products_seed.json:", err);
      return [];
    }
  }

  /**
   * Fetches Khata customer records
   */
  async getCustomers() {
    if (this.isCloudEnabled && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('customers')
          .select('*')
          .order('name');
        if (!error && data && data.length > 0) {
          localStorage.setItem(this.config.STORAGE_KEYS.CUSTOMERS, JSON.stringify(data));
          return data;
        }
      } catch (e) {}
    }

    const cached = localStorage.getItem(this.config.STORAGE_KEYS.CUSTOMERS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    try {
      const res = await fetch('data/customers_seed.json');
      const seedCustomers = await res.json();
      localStorage.setItem(this.config.STORAGE_KEYS.CUSTOMERS, JSON.stringify(seedCustomers));
      return seedCustomers;
    } catch (err) {
      return [];
    }
  }

  /**
   * Authenticates Khata customer by Phone number
   */
  async findCustomerByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) return null;
    const customers = await this.getCustomers();
    return customers.find(c => {
      const cPhone = String(c.phone).replace(/[^0-9]/g, '');
      if (cPhone === cleanPhone) return true;
      if (cPhone.length >= 9 && cleanPhone.length >= 9) {
        return cPhone.slice(-9) === cleanPhone.slice(-9);
      }
      return false;
    }) || null;
  }

  /**
   * Creates a new Draft Order awaiting Owner Mobile Approval
   */
  async createDraftOrder(orderData) {
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `KASK-${codeNum}`;
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    const orderPayload = {
      id: crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`,
      order_code: orderCode,
      pickup_code: pickupCode,
      customer_id: orderData.customer_id || null,
      customer_name: orderData.customer_name || "Guest Customer",
      customer_phone: orderData.customer_phone,
      order_type: orderData.order_type || "PICKUP", // PICKUP or DELIVERY
      delivery_address: orderData.delivery_address || (orderData.order_type === 'PICKUP' ? "In-Store Counter Pickup" : ""),
      items: orderData.items || [],
      items_count: orderData.items.reduce((sum, item) => sum + item.qty, 0),
      subtotal: orderData.subtotal,
      delivery_fee: orderData.delivery_fee || 0,
      total_amount: orderData.total_amount,
      payment_mode: orderData.payment_mode || "FONEPAY_QR",
      status: "PENDING_APPROVAL",
      notes: orderData.notes || "",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min TTL
    };

    // Save to Cloud Supabase if active
    if (this.isCloudEnabled && this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient
          .from('draft_orders')
          .insert({
            id: orderPayload.id,
            order_code: orderPayload.order_code,
            pickup_code: orderPayload.pickup_code,
            customer_id: orderPayload.customer_id,
            customer_name: orderPayload.customer_name,
            customer_phone: orderPayload.customer_phone,
            order_type: orderPayload.order_type,
            delivery_address: orderPayload.delivery_address,
            items_count: orderPayload.items_count,
            subtotal: orderPayload.subtotal,
            delivery_fee: orderPayload.delivery_fee,
            total_amount: orderPayload.total_amount,
            payment_mode: orderPayload.payment_mode,
            status: orderPayload.status,
            notes: orderPayload.notes
          });
        
        if (!error) {
          // Insert items
          const itemsPayload = orderPayload.items.map(item => ({
            order_id: orderPayload.id,
            product_id: item.id,
            product_name: item.name,
            volume_ml: item.volume_ml,
            unit_price: item.price,
            qty: item.qty,
            line_total: item.price * item.qty
          }));
          await this.supabaseClient.from('draft_order_items').insert(itemsPayload);
        }
      } catch (e) {
        console.warn("[KASK API] Cloud draft order insert failed, saved to local cache:", e);
      }
    }

    // Always update local storage orders queue
    const orders = this.getLocalOrders();
    orders.unshift(orderPayload);
    localStorage.setItem(this.config.STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Dispatch custom event for real-time local reactivity
    window.dispatchEvent(new CustomEvent('kask:order_created', { detail: orderPayload }));

    return orderPayload;
  }

  /**
   * Retrieves an order by its human-friendly code (e.g. KASK-1042)
   */
  async getDraftOrderByCode(orderCode) {
    if (this.isCloudEnabled && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('draft_orders')
          .select('*, draft_order_items(*)')
          .eq('order_code', orderCode)
          .single();
        if (!error && data) {
          return {
            ...data,
            items: data.draft_order_items || []
          };
        }
      } catch (e) {}
    }

    const orders = this.getLocalOrders();
    return orders.find(o => o.order_code === orderCode) || null;
  }

  /**
   * Retrieves all orders (used by Owner Mobile Approval screen)
   */
  async getAllDraftOrders() {
    if (this.isCloudEnabled && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('draft_orders')
          .select('*, draft_order_items(*)')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(d => ({ ...d, items: d.draft_order_items || [] }));
        }
      } catch (e) {}
    }

    return this.getLocalOrders();
  }

  /**
   * Owner action: Approve or Reject a draft order
   */
  async updateOrderStatus(orderCode, status, reason = "") {
    const orders = this.getLocalOrders();
    const order = orders.find(o => o.order_code === orderCode);
    if (!order) return null;

    order.status = status;
    order.rejection_reason = reason;
    order.approved_at = status === 'APPROVED' ? new Date().toISOString() : null;

    localStorage.setItem(this.config.STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    if (this.isCloudEnabled && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('draft_orders')
          .update({
            status: status,
            rejection_reason: reason,
            approved_at: order.approved_at
          })
          .eq('order_code', orderCode);
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('kask:order_status_updated', { detail: order }));
    return order;
  }

  getLocalOrders() {
    try {
      const stored = localStorage.getItem(this.config.STORAGE_KEYS.ORDERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }
}

// Global API Singleton
window.api = new KaskAPI();
