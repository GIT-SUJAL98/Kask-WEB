#!/usr/bin/env python3
"""
=============================================================================
KASK LIQUOR MART — POS TO CLOUD BIDIRECTIONAL SYNC AGENT
=============================================================================
Syncs local SQLite WAL database (pos_data.db) with Supabase Cloud Relay:
1. Pushes local product catalog, pricing, and stock levels up to Supabase.
2. Pushes local Khata customer balances and credit limits up to Supabase.
3. Pulls APPROVED web draft orders from Supabase and automatically injects them
   into the desktop POS `parked_carts` table (Recalled via F9 key at register).
=============================================================================
"""

import os
import sys
import time
import json
import sqlite3
import argparse
import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("[WARN] 'requests' not installed. Running in local dry-run simulation mode.")
    requests = None

# Default configuration
DEFAULT_CONFIG = {
    "supabase_url": "https://your-project.supabase.co",
    "supabase_key": "your-supabase-service-role-or-anon-key",
    "db_path": "../POS KASK/KASK_Liquor_Mart_POS_Lubuntu_Portable/pos_data.db",
    "sync_interval_seconds": 30,
    "store_code": "KASK_MAIN"
}

CONFIG_FILE = Path(__file__).parent / "sync_config.json"


def load_config():
    """Loads configuration from file or creates a default template."""
    if not CONFIG_FILE.exists():
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        print(f"[*] Generated template config at {CONFIG_FILE}")
        return DEFAULT_CONFIG
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[!] Error loading config: {e}. Using defaults.")
        return DEFAULT_CONFIG


def get_sqlite_conn(db_path):
    """Establishes connection to local SQLite database in WAL mode."""
    resolved_path = Path(db_path).resolve()
    if not resolved_path.exists():
        # Try local fallback
        alt_path = Path("pos_data.db").resolve()
        if alt_path.exists():
            resolved_path = alt_path
        else:
            raise FileNotFoundError(f"POS database not found at {resolved_path}")

    conn = sqlite3.connect(str(resolved_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def push_catalog(conn, config):
    """Pushes local product inventory and pricing to Supabase."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, barcode, name, volume_ml, unit, category, 
               selling_price, pack_price, stock_qty, min_stock_alert 
        FROM products
    """)
    products = [dict(r) for r in cur.fetchall()]

    print(f"[*] Loaded {len(products)} products from local POS database.")

    if not requests or not config.get("supabase_url") or "your-project" in config.get("supabase_url"):
        # Local mock export
        export_path = Path(__file__).parent.parent / "data" / "products_seed.json"
        export_path.parent.mkdir(parents=True, exist_ok=True)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(products, f, indent=2)
        print(f"    -> [DRY RUN] Exported {len(products)} items to {export_path.name}")
        return len(products)

    headers = {
        "apikey": config["supabase_key"],
        "Authorization": f"Bearer {config['supabase_key']}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    url = f"{config['supabase_url']}/rest/v1/products"

    # Batch upsert in chunks of 50
    chunk_size = 50
    total_upserted = 0
    for i in range(0, len(products), chunk_size):
        chunk = products[i:i + chunk_size]
        res = requests.post(url, headers=headers, json=chunk)
        if res.status_code in (200, 201):
            total_upserted += len(chunk)
        else:
            print(f"[!] Supabase product upsert failed: {res.status_code} - {res.text}")
            break

    print(f"    -> Uploaded {total_upserted} products to Supabase.")
    return total_upserted


def push_customers(conn, config):
    """Pushes Khata credit balances and limits to Supabase."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, phone, credit_limit, current_balance 
        FROM customers
    """)
    customers = [dict(r) for r in cur.fetchall()]

    print(f"[*] Loaded {len(customers)} customers from local POS database.")

    if not requests or not config.get("supabase_url") or "your-project" in config.get("supabase_url"):
        export_path = Path(__file__).parent.parent / "data" / "customers_seed.json"
        export_path.parent.mkdir(parents=True, exist_ok=True)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(customers, f, indent=2)
        print(f"    -> [DRY RUN] Exported {len(customers)} customers to {export_path.name}")
        return len(customers)

    headers = {
        "apikey": config["supabase_key"],
        "Authorization": f"Bearer {config['supabase_key']}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    url = f"{config['supabase_url']}/rest/v1/customers"

    res = requests.post(url, headers=headers, json=customers)
    if res.status_code in (200, 201):
        print(f"    -> Uploaded {len(customers)} customers to Supabase.")
        return len(customers)
    else:
        print(f"[!] Customer upsert error: {res.status_code} - {res.text}")
        return 0


def pull_approved_orders(conn, config):
    """
    Pulls APPROVED web orders from Supabase that have not yet been parked
    into the local desktop POS register.
    """
    if not requests or not config.get("supabase_url") or "your-project" in config.get("supabase_url"):
        return 0

    headers = {
        "apikey": config["supabase_key"],
        "Authorization": f"Bearer {config['supabase_key']}",
        "Content-Type": "application/json"
    }
    
    # Query orders that are APPROVED and pos_parked_cart_id is null
    url = f"{config['supabase_url']}/rest/v1/draft_orders?status=eq.APPROVED&pos_parked_cart_id=is.null&select=*,draft_order_items(*)"
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"[!] Failed to fetch approved orders: {res.status_code} - {res.text}")
            return 0
        
        approved_orders = res.json()
        if not approved_orders:
            return 0

        print(f"[SYNC] Found {len(approved_orders)} newly approved web orders to park in POS register.")
        cur = conn.cursor()

        for order in approved_orders:
            order_id = order["id"]
            code = order.get("order_code", "WEB-ORD")
            cust_name = order.get("customer_name", "Web Customer")
            cust_id = order.get("customer_id")
            total = float(order.get("total_amount", 0.0))
            items_raw = order.get("draft_order_items", [])

            # Transform into the exact POS cart JSON structure
            cart_items = []
            for it in items_raw:
                cart_items.append({
                    "id": it.get("product_id"),
                    "name": it.get("product_name"),
                    "price": float(it.get("unit_price", 0.0)),
                    "qty": int(it.get("qty", 1)),
                    "subtotal": float(it.get("line_total", 0.0)),
                    "volume_ml": it.get("volume_ml", None)
                })

            cart_payload = {
                "items": cart_items,
                "discount": 0.0,
                "premium": 0.0,
                "customer_id": cust_id,
                "customer_name": cust_name,
                "saved_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "order_code": code,
                "delivery_address": order.get("delivery_address", "Pickup at Counter"),
                "payment_mode": order.get("payment_mode", "FONEPAY_QR")
            }

            cart_json_str = json.dumps(cart_payload)
            cart_label = f"🌐 Web #{code} - {cust_name}"

            # Insert into SQLite parked_carts
            cur.execute("""
                INSERT INTO parked_carts 
                (cart_name, cart_data, total_amount, item_count, customer_id, customer_name)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cart_label, cart_json_str, total, len(cart_items), cust_id, cust_name))
            
            new_parked_id = cur.lastrowid
            conn.commit()

            print(f"    -> [SUCCESS] Order #{code} parked in POS as Cart ID #{new_parked_id}. Cashier can recall with F9!")

            # Update Supabase draft_orders with the local parked cart ID
            patch_url = f"{config['supabase_url']}/rest/v1/draft_orders?id=eq.{order_id}"
            requests.patch(patch_url, headers=headers, json={
                "pos_parked_cart_id": new_parked_id,
                "status": "PACKED"
            })

        return len(approved_orders)

    except Exception as e:
        print(f"[!] Error syncing approved orders to POS: {e}")
        return 0


def main():
    parser = argparse.ArgumentParser(description="KASK POS to Cloud Sync Daemon")
    parser.add_argument("--once", action="store_true", help="Run a single sync cycle and exit")
    parser.add_argument("--daemon", action="store_true", help="Run continuously in background")
    args = parser.parse_args()

    config = load_config()
    db_path = config.get("db_path")

    print("=======================================================")
    print("  KASK LIQUOR MART — POS TO CLOUD SYNC AGENT")
    print("=======================================================")
    print(f"Database Path : {db_path}")
    print(f"Supabase Relay: {config.get('supabase_url')}")
    print(f"Sync Interval : {config.get('sync_interval_seconds')} seconds")
    print("=======================================================")

    conn = get_sqlite_conn(db_path)

    if args.once or not args.daemon:
        print("[*] Running single sync cycle...")
        push_catalog(conn, config)
        push_customers(conn, config)
        pull_approved_orders(conn, config)
        print("[OK] Sync cycle complete.")
        return

    # Continuous daemon loop
    interval = config.get("sync_interval_seconds", 30)
    print(f"[*] Entering daemon mode. Polling every {interval}s. Press Ctrl+C to stop.")
    try:
        while True:
            try:
                push_catalog(conn, config)
                push_customers(conn, config)
                pull_approved_orders(conn, config)
            except Exception as e:
                print(f"[!] Error in sync cycle: {e}")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[*] Sync daemon stopped by operator.")


if __name__ == "__main__":
    main()
