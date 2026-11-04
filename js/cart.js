/**
 * TOTAL WINE & MORE — SHOPPING CART & DRAFT ORDER MANAGER (V3 Master)
 * Implements "Mix 6 & Save 10%" promotion engine, free delivery tracker,
 * Web Audio sound feedback, and Khata credit verification.
 */

class TotalWineCart {
  constructor() {
    this.config = window.KASK_CONFIG;
    this.items = this.loadCart();
    this.fulfillment = 'PICKUP'; // 'PICKUP', 'DELIVERY', 'CURBSIDE'
    this.deliveryAddress = '';
    this.deliveryZone = this.config.ALLOWED_DELIVERY_ZONES[0];
    this.paymentMode = 'FONEPAY_QR'; // 'FONEPAY_QR', 'KHATA', 'CASH'
    this.customerName = '';
    this.customerPhone = '';
    this.orderNotes = '';
    this.audioContext = null;
    this.audioEnabled = true;
  }

  loadCart() {
    try {
      const stored = localStorage.getItem(this.config.STORAGE_KEYS.CART);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem(this.config.STORAGE_KEYS.CART, JSON.stringify(this.items));
    this.updateBadges();
    window.dispatchEvent(new CustomEvent('kask:cart_updated', { detail: this }));
  }

  /* Zero-dependency Web Audio Sound Synthesizer */
  playChime(type = 'add') {
    if (!this.audioEnabled) return;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      if (type === 'add') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'remove') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.15); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.55);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      }
    } catch (e) {}
  }

  addItem(product, qtyToAdd = 1) {
    const existing = this.items.find(i => i.id === product.id);
    const stock = product.stock_qty || 999;

    if (existing) {
      if (existing.qty + qtyToAdd > stock) {
        this.showToast(`Cannot add more than ${stock} bottles (store counter limit)`);
        return false;
      }
      existing.qty += qtyToAdd;
    } else {
      if (qtyToAdd > stock) {
        this.showToast(`Only ${stock} bottle(s) available in store stock`);
        return false;
      }
      this.items.push({
        id: product.id,
        name: product.name,
        category: product.category,
        volume_ml: product.volume_ml,
        price: parseFloat(product.selling_price || 0),
        qty: qtyToAdd,
        stock_qty: stock,
        is_mix6_eligible: product.is_mix6_eligible !== false
      });
    }

    this.saveCart();
    this.playChime('add');
    this.showToast(`Added ${product.name} to cart`);
    return true;
  }

  updateQty(productId, delta) {
    const item = this.items.find(i => i.id === productId);
    if (!item) return;

    if (delta > 0 && item.stock_qty && item.qty >= item.stock_qty) {
      this.showToast(`Maximum store shelf stock reached (${item.stock_qty})`);
      return;
    }

    item.qty += delta;
    if (item.qty <= 0) {
      this.removeItem(productId);
      return;
    }

    this.saveCart();
    this.playChime(delta > 0 ? 'add' : 'remove');
  }

  removeItem(productId) {
    const removedItem = this.items.find(i => i.id === productId);
    this.items = this.items.filter(i => i.id !== productId);
    this.saveCart();
    this.playChime('remove');

    if (removedItem) {
      this.showToast(`Removed ${removedItem.name}`);
    }
  }

  clear() {
    this.items = [];
    this.saveCart();
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  /* Total Wine "Mix 6 & Save 10%" Promotion Engine */
  getMix6BottleCount() {
    // Count bottles of Wine, Whiskey, Spirits, and eligible items
    return this.items
      .filter(item => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes('whiskey') || cat.includes('wine') || cat.includes('vodka') || cat.includes('rum') || cat.includes('gin') || item.is_mix6_eligible;
      })
      .reduce((sum, item) => sum + item.qty, 0);
  }

  isMix6Unlocked() {
    return this.getMix6BottleCount() >= 6;
  }

  getMix6Discount() {
    if (!this.isMix6Unlocked()) return 0;
    // 10% discount on qualifying spirits/wine items
    const qualifyingSubtotal = this.items
      .filter(item => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes('whiskey') || cat.includes('wine') || cat.includes('vodka') || cat.includes('rum') || cat.includes('gin') || item.is_mix6_eligible;
      })
      .reduce((sum, item) => sum + (item.price * item.qty), 0);
    return Math.round(qualifyingSubtotal * 0.10);
  }

  getFreeDeliveryThreshold() {
    return this.config.FREE_DELIVERY_THRESHOLD || 3000.0;
  }

  getDeliveryFee() {
    if (this.fulfillment === 'PICKUP' || this.fulfillment === 'CURBSIDE') return 0;
    const subtotal = this.getSubtotal() - this.getMix6Discount();
    if (subtotal >= this.getFreeDeliveryThreshold()) return 0;
    return this.config.DELIVERY_FEE || 100.0;
  }

  getFreeDeliveryProgress() {
    const subtotal = this.getSubtotal() - this.getMix6Discount();
    const threshold = this.getFreeDeliveryThreshold();
    const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
    const remaining = Math.max(0, threshold - subtotal);
    const isUnlocked = subtotal >= threshold;
    return { pct, remaining, isUnlocked, threshold };
  }

  getTotal() {
    return Math.max(0, this.getSubtotal() - this.getMix6Discount() + this.getDeliveryFee());
  }

  updateBadges() {
    const count = this.getItemCount();
    const total = this.getTotal();

    // Badges in Header & Mobile
    document.querySelectorAll('#cartCountBadge, .cart-count-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    document.querySelectorAll('#mobileCartCountInline, .cart-count-badge-inline').forEach(el => {
      el.textContent = count;
    });

    const headerTotalEl = document.getElementById('cartHeaderTotalText');
    if (headerTotalEl) {
      headerTotalEl.textContent = `Rs. ${total.toLocaleString()}`;
    }

    // Update Mix 6 Promotion Strip Tracker
    const mix6Count = this.getMix6BottleCount();
    const mix6Pct = Math.min(100, Math.round((mix6Count / 6) * 100));
    const mix6Fill = document.getElementById('mix6ProgressFill');
    const mix6Text = document.getElementById('mix6StatusText');

    if (mix6Fill) mix6Fill.style.width = `${mix6Pct}%`;
    if (mix6Text) {
      if (mix6Count >= 6) {
        mix6Text.textContent = `🎉 10% Discount Unlocked (${mix6Count} bottles)`;
        mix6Text.style.color = '#FCD34D';
      } else {
        const remaining = 6 - mix6Count;
        mix6Text.textContent = `${mix6Count} of 6 Added (Add ${remaining} more to save 10%)`;
        mix6Text.style.color = '#FFFFFF';
      }
    }
  }

  showToast(msg) {
    let toast = document.getElementById('kaskToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kaskToast';
      toast.className = 'toast-box';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="toast-icon">✓</span> <span>${msg}</span>`;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  /**
   * Submits order to Cloud & Store POS Till Queue
   */
  async submitDraftOrder() {
    if (this.items.length === 0) {
      throw new Error("Your cart is empty. Please select products first.");
    }

    const cleanPhone = this.customerPhone ? this.customerPhone.trim().replace(/[^0-9]/g, '') : '';
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error("Please enter a valid mobile phone number for WhatsApp order updates.");
    }

    if (this.fulfillment === 'DELIVERY' && (!this.deliveryAddress || this.deliveryAddress.trim().length < 4)) {
      throw new Error("Please enter a complete Lalitpur delivery landmark or street address.");
    }

    let customerId = null;

    // Khata (Store Credit) Safety Verification
    if (this.paymentMode === 'KHATA') {
      const customer = await window.api.findCustomerByPhone(cleanPhone);
      if (!customer) {
        throw new Error(`Phone number ${cleanPhone} is not registered as an active Khata account at Total Wine / KASK. Please select FonePay QR or Cash.`);
      }
      customerId = customer.id;
      const currentDue = parseFloat(customer.current_balance || 0);
      const limit = parseFloat(customer.credit_limit || 0);
      const orderTotal = this.getTotal();
      const projected = currentDue + orderTotal;

      if (projected > limit) {
        throw new Error(`Khata Credit Limit Exceeded! Current due: Rs. ${currentDue.toLocaleString()} (Limit: Rs. ${limit.toLocaleString()}). This Rs. ${orderTotal.toLocaleString()} order exceeds your available balance.`);
      }
    }

    const orderData = {
      customer_id: customerId,
      customer_name: this.customerName.trim() || (this.paymentMode === 'KHATA' ? "Khata VIP Member" : "Guest Customer"),
      customer_phone: cleanPhone,
      order_type: this.fulfillment === 'CURBSIDE' ? 'PICKUP' : this.fulfillment,
      delivery_address: this.fulfillment === 'DELIVERY' 
        ? `${this.deliveryZone}: ${this.deliveryAddress.trim()}` 
        : `Total Wine & More Counter (${this.fulfillment === 'CURBSIDE' ? 'Curbside Vehicle Collection' : 'In-Store Pickup'})`,
      items: this.items,
      subtotal: this.getSubtotal(),
      mix6_discount: this.getMix6Discount(),
      delivery_fee: this.getDeliveryFee(),
      total_amount: this.getTotal(),
      payment_mode: this.paymentMode,
      notes: this.orderNotes.trim()
    };

    const draft = await window.api.createDraftOrder(orderData);
    this.playChime('success');
    this.clear();
    return draft;
  }
}

window.cart = new TotalWineCart();
