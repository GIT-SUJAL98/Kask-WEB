/**
 * KASK LIQUOR MART — WEB CONFIGURATION
 * Place your Supabase URL & Anon Key here to enable live cloud sync.
 * When left as defaults, the app seamlessly uses the local seed database.
 */
window.KASK_CONFIG = {
  // Supabase Configuration (Leave empty or placeholder for offline / seed mode)
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Store Metadata & Compliance
  STORE_NAME: "KASK Liquor Mart",
  STORE_PHONE: "+977-9851133129",
  STORE_WHATSAPP: "9779851133129",
  STORE_LOCATION: "Mahalaxmi Municipality, Lalitpur, Nepal",
  
  // Operating Hours & Curfew (24-hour format)
  OPEN_HOUR: 10,  // 10:00 AM
  CLOSE_HOUR: 21, // 9:30 PM (21:30)
  CLOSE_MINUTE: 30,
  
  // Liquor Regulation
  LEGAL_MIN_AGE: 18,
  
  // Delivery Rules
  DELIVERY_FEE: 100.0,
  FREE_DELIVERY_THRESHOLD: 3000.0,
  ALLOWED_DELIVERY_ZONES: [
    "Mahalaxmi",
    "Imadol",
    "Gwarko",
    "Sanogaucharan",
    "Lubhu",
    "Tikathali",
    "Balkumari"
  ],

  // Storage Keys
  STORAGE_KEYS: {
    AGE_VERIFIED: "kask_age_verified_v1",
    CART: "kask_cart_v1",
    CUSTOMER_SESSION: "kask_customer_session_v1",
    ORDERS: "kask_draft_orders_v1",
    PRODUCTS: "kask_products_cache_v1",
    CUSTOMERS: "kask_customers_cache_v1"
  }
};
