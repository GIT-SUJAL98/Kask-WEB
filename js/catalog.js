/**
 * TOTAL WINE & MORE — CATALOG, FACETED FILTERS & UI CONTROLLER (V3 Master)
 * Implements full Total Wine & More e-commerce architecture:
 * - Product data enrichment (origin, star ratings, review counts, MSRP, awards)
 * - Multi-criteria faceted filter accordion engine
 * - Active filter tag pills & quick clear
 * - "Mix 6 & Save 10%" promotion calculation
 * - Store selector modal & mobile filter drawer
 * - High-density product cards & quick view modal
 */

document.addEventListener('DOMContentLoaded', async () => {
  const productGrid = document.getElementById('productGrid');
  const catalogItemCount = document.getElementById('catalogItemCount');
  const catalogSortSelect = document.getElementById('catalogSortSelect');
  const searchInput = document.getElementById('searchInput');
  const searchDeptSelect = document.getElementById('searchDeptSelect');
  const searchForm = document.getElementById('searchForm');
  const activeFiltersBox = document.getElementById('activeFiltersBox');
  const btnClearAllFilters = document.getElementById('btnClearAllFilters');

  // Accordion Containers
  const filterDeptBody = document.getElementById('filterDeptBody');
  const filterOriginBody = document.getElementById('filterOriginBody');
  const filterVolumeBody = document.getElementById('filterVolumeBody');

  // Checkboxes & Radios
  const chkRating45 = document.getElementById('chkRating45');
  const chkStaffPick = document.getElementById('chkStaffPick');
  const chkMix6Only = document.getElementById('chkMix6Only');
  const chkInStockOnly = document.getElementById('chkInStockOnly');
  const chkPackDealsOnly = document.getElementById('chkPackDealsOnly');

  // Modals & Drawers
  const quickViewModal = document.getElementById('quickViewModal');
  const quickViewCardContent = document.getElementById('quickViewCardContent');
  const storeSelectorModal = document.getElementById('storeSelectorModal');
  const openStoreSelectorBtn = document.getElementById('openStoreSelectorBtn');
  const closeStoreModalBtn = document.getElementById('closeStoreModalBtn');
  const btnConfirmStoreSelection = document.getElementById('btnConfirmStoreSelection');
  const currentStoreNameText = document.getElementById('currentStoreNameText');

  // Cart Drawer
  const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
  const headerCartBtn = document.getElementById('headerCartBtn');
  const mobileNavCartBtn = document.getElementById('mobileNavCartBtn');

  // Mobile Filter Drawer
  const mobileFilterDrawer = document.getElementById('mobileFilterDrawer');
  const openMobileFilterBtn = document.getElementById('openMobileFilterBtn');
  const closeMobileFilterBtn = document.getElementById('closeMobileFilterBtn');
  const mobileFilterDrawerContent = document.getElementById('mobileFilterDrawerContent');
  const btnMobileClearAll = document.getElementById('btnMobileClearAll');
  const btnMobileApplyFilters = document.getElementById('btnMobileApplyFilters');
  const mobileNavSearchBtn = document.getElementById('mobileNavSearchBtn');

  // Mobile Navigation Drawer
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  const openMobileNavBtn = document.getElementById('openMobileNavBtn');
  const closeMobileNavBtn = document.getElementById('closeMobileNavBtn');
  const mobileDrawerStoreChangeBtn = document.getElementById('mobileDrawerStoreChangeBtn');

  // Fulfillment Chips in Hero
  const chipPickup = document.getElementById('chipPickup');
  const chipDelivery = document.getElementById('chipDelivery');
  const chipCurbside = document.getElementById('chipCurbside');

  let allProducts = [];
  let selectedDepartments = new Set();
  let selectedOrigins = new Set();
  let selectedVolumes = new Set();
  let selectedPriceRange = 'ALL';
  let searchQuery = '';
  let searchDept = 'ALL';
  let sortBy = 'featured';

  // 1. Render Skeletons during data load
  renderSkeletons(8);

  // 2. Fetch and Enrich Products
  try {
    const rawProducts = await window.api.getProducts();
    allProducts = rawProducts.map(p => enrichProductData(p));
    buildFacetedFilterUI(allProducts);
    filterAndRender();
  } catch (err) {
    console.error("[Total Wine] Error loading products:", err);
    if (productGrid) {
      productGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
          <h3 style="color: var(--text-primary); font-size: 18px; margin-bottom: 6px;">Unable to load catalog</h3>
          <p style="font-size: 13.5px;">Please check your internet connection or call our store at +977-9851133129.</p>
        </div>
      `;
    }
  }

  // 3. Setup Cart Listeners
  if (headerCartBtn) headerCartBtn.addEventListener('click', openCartDrawer);
  if (mobileNavCartBtn) mobileNavCartBtn.addEventListener('click', openCartDrawer);
  if (cartDrawerOverlay) {
    cartDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === cartDrawerOverlay) closeCartDrawer();
    });
  }

  window.addEventListener('kask:cart_updated', () => {
    renderCartDrawer();
    filterAndRender(); // Keep steppers synchronized
  });

  // 4. Omnichannel Search Form
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      searchQuery = (searchInput?.value || '').toLowerCase().trim();
      searchDept = searchDeptSelect?.value || 'ALL';
      filterAndRender();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterAndRender();
    });
  }

  if (searchDeptSelect) {
    searchDeptSelect.addEventListener('change', (e) => {
      searchDept = e.target.value;
      filterAndRender();
    });
  }

  if (mobileNavSearchBtn && searchInput) {
    mobileNavSearchBtn.addEventListener('click', () => {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // 5. Sort Selector
  if (catalogSortSelect) {
    catalogSortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      filterAndRender();
    });
  }

  // 6. Accordion Toggles
  document.querySelectorAll('.accordion-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.filter-accordion');
      if (parent) {
        parent.classList.toggle('open');
        const isNowOpen = parent.classList.contains('open');
        btn.setAttribute('aria-expanded', isNowOpen ? 'true' : 'false');
      }
    });
  });

  // 7. Price Range Radio Listeners
  document.querySelectorAll('input[name="priceRange"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedPriceRange = e.target.value;
      filterAndRender();
    });
  });

  // 8. Rating & Badges Checkbox Listeners
  [chkRating45, chkStaffPick, chkMix6Only, chkInStockOnly, chkPackDealsOnly].forEach(chk => {
    chk?.addEventListener('change', filterAndRender);
  });

  // 9. Clear All Filters Button
  if (btnClearAllFilters) {
    btnClearAllFilters.addEventListener('click', resetAllFilters);
  }

  // 10. Hero Fulfillment Chips
  setupFulfillmentChips();

  // 11. Store Selector Modal
  setupStoreSelectorModal();

  // 12. Mega Menu Category Click Shortcuts
  setupMegaMenuTriggers();

  // 13. Mobile Filter Drawer Setup
  setupMobileFilterDrawer();

  // 14. Mobile Navigation Drawer Setup
  setupMobileNavDrawer();

  // Initialize cart badges
  window.cart.updateBadges();

  /**
   * Enriches raw database products with Total Wine specifications
   */
  function enrichProductData(p) {
    const name = p.name || '';
    const cat = p.category || 'General';
    let origin = 'International';
    let typeDesc = cat;
    let bottleIcon = '🍷';
    let points = 0;
    let isStaffPick = false;
    let isMix6 = false;
    let aisle = 'Aisle 2, Shelf B';

    const lower = name.toLowerCase();

    // Determine Origin, Type & Icon
    if (lower.includes('glenfiddich') || lower.includes('chivas') || lower.includes('whisky') || lower.includes('malt') || lower.includes('highland') || lower.includes('black label') || lower.includes('red label') || lower.includes('double black')) {
      origin = 'Scotland';
      typeDesc = 'Single Malt & Blended Scotch';
      bottleIcon = '🥃';
      isMix6 = true;
      aisle = 'Spirits Aisle 4 • Single Malt Bay';
      if (lower.includes('glenfiddich') || lower.includes('chivas') || lower.includes('double black')) {
        isStaffPick = true;
        points = 94 + (p.id % 3);
      }
    } else if (lower.includes('jack daniel') || lower.includes('jim beam') || lower.includes('bourbon') || lower.includes('signature')) {
      origin = 'USA';
      typeDesc = 'Kentucky Bourbon & American Whiskey';
      bottleIcon = '🥃';
      isMix6 = true;
      aisle = 'Spirits Aisle 3 • Bourbon Wall';
    } else if (lower.includes('khukri') || lower.includes('mustang') || lower.includes('marpha') || lower.includes('gorkha') || lower.includes('ruslan') || lower.includes('golden oak') || lower.includes('virgin')) {
      origin = 'Nepal';
      typeDesc = 'Nepal Heritage Spirits & Beers';
      bottleIcon = lower.includes('beer') || lower.includes('gorkha') ? '🍺' : '🥃';
      aisle = 'Local Craft Bay 1';
      if (lower.includes('khukri') || lower.includes('ruslan')) {
        isStaffPick = true;
        points = 92;
      }
    } else if (lower.includes('tuborg') || lower.includes('carlsberg')) {
      origin = 'Denmark';
      typeDesc = 'Premium European Lager';
      bottleIcon = '🍺';
      aisle = 'Chilled Beer Cooler 3';
    } else if (cat.toLowerCase().includes('wine')) {
      origin = 'France';
      typeDesc = 'Fine Table & Cellar Wine';
      bottleIcon = '🍷';
      isMix6 = true;
      isStaffPick = true;
      points = 91 + (p.id % 5);
      aisle = 'Wine Cellar Aisle 1';
    } else if (cat.toLowerCase().includes('beer')) {
      origin = 'Craft Brewery';
      typeDesc = 'Cold Draught & Bottled Beer';
      bottleIcon = '🍺';
      aisle = 'Beer Cooler Bay 2';
    } else if (cat.toLowerCase().includes('vodka')) {
      origin = 'Europe';
      typeDesc = 'Filtered Grain Vodka';
      bottleIcon = '🍸';
      isMix6 = true;
      aisle = 'Spirits Aisle 1';
    } else if (cat.toLowerCase().includes('gin')) {
      origin = 'United Kingdom';
      typeDesc = 'London Dry Botanical Gin';
      bottleIcon = '🍸';
      isMix6 = true;
      aisle = 'Spirits Aisle 2';
    } else if (cat.toLowerCase().includes('soft') || cat.toLowerCase().includes('energy')) {
      origin = 'Soft Drinks';
      typeDesc = 'Chilled Mixers & Energy Drinks';
      bottleIcon = '🥤';
      aisle = 'Mixers & Beverage Cooler';
    } else if (cat.toLowerCase().includes('snack')) {
      origin = 'Gourmet Bar Snacks';
      typeDesc = 'Crisps, Peanuts & Bites';
      bottleIcon = '🍿';
      aisle = 'Front Counter Snack Display';
    } else if (cat.toLowerCase().includes('cigrate') || cat.toLowerCase().includes('tobacco')) {
      origin = 'Cigarettes';
      typeDesc = 'Premium Filter Cigarettes';
      bottleIcon = '🚬';
      aisle = 'Behind Register Humidor';
    }

    // Dynamic MSRP calculation
    const price = parseFloat(p.selling_price || 0);
    const msrp = Math.round(price * 1.15);
    const savings = Math.max(0, msrp - price);

    // Realistic Star Rating
    const seedRating = 4.2 + ((p.id * 7) % 7) / 10;
    const rating = Math.min(5.0, Math.round(seedRating * 10) / 10);
    const reviewsCount = 20 + ((p.id * 19) % 280);

    return {
      ...p,
      origin,
      type_desc: typeDesc,
      bottle_icon: bottleIcon,
      points,
      is_staff_pick: isStaffPick,
      is_mix6_eligible: isMix6,
      aisle,
      msrp,
      savings,
      rating,
      reviews_count: reviewsCount
    };
  }

  /**
   * Build Faceted Filter Checkbox Lists dynamically
   */
  function buildFacetedFilterUI(products) {
    if (!filterDeptBody || !filterOriginBody || !filterVolumeBody) return;

    // 1. Department List
    const deptMap = {};
    products.forEach(p => {
      const d = p.category || 'General';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });

    filterDeptBody.innerHTML = Object.keys(deptMap).sort().map(d => `
      <label class="filter-checkbox-label">
        <span><input type="checkbox" class="chk-dept" value="${d}"> ${d}</span>
        <span class="filter-item-count">(${deptMap[d]})</span>
      </label>
    `).join('');

    // 2. Origin List
    const originMap = {};
    products.forEach(p => {
      const o = p.origin || 'International';
      originMap[o] = (originMap[o] || 0) + 1;
    });

    filterOriginBody.innerHTML = Object.keys(originMap).sort().map(o => `
      <label class="filter-checkbox-label">
        <span><input type="checkbox" class="chk-origin" value="${o}"> ${o}</span>
        <span class="filter-item-count">(${originMap[o]})</span>
      </label>
    `).join('');

    // 3. Volume List
    const volMap = {};
    products.forEach(p => {
      const v = p.volume_ml ? `${p.volume_ml} ml` : (p.unit || 'Standard Bottle');
      volMap[v] = (volMap[v] || 0) + 1;
    });

    filterVolumeBody.innerHTML = Object.keys(volMap).sort().map(v => `
      <label class="filter-checkbox-label">
        <span><input type="checkbox" class="chk-volume" value="${v}"> ${v}</span>
        <span class="filter-item-count">(${volMap[v]})</span>
      </label>
    `).join('');

    // Attach Change Listeners
    document.querySelectorAll('.chk-dept').forEach(chk => {
      chk.addEventListener('change', () => {
        if (chk.checked) selectedDepartments.add(chk.value);
        else selectedDepartments.delete(chk.value);
        filterAndRender();
      });
    });

    document.querySelectorAll('.chk-origin').forEach(chk => {
      chk.addEventListener('change', () => {
        if (chk.checked) selectedOrigins.add(chk.value);
        else selectedOrigins.delete(chk.value);
        filterAndRender();
      });
    });

    document.querySelectorAll('.chk-volume').forEach(chk => {
      chk.addEventListener('change', () => {
        if (chk.checked) selectedVolumes.add(chk.value);
        else selectedVolumes.delete(chk.value);
        filterAndRender();
      });
    });
  }

  /**
   * Filter, Sort & Render Product Cards
   */
  function filterAndRender() {
    if (!productGrid) return;

    let filtered = [...allProducts];

    // Department Checkbox Filter
    if (selectedDepartments.size > 0) {
      filtered = filtered.filter(p => selectedDepartments.has(p.category));
    }

    // Omnichannel Search Department Filter
    if (searchDept !== 'ALL') {
      filtered = filtered.filter(p => {
        const cat = (p.category || '').toLowerCase();
        if (searchDept === 'Spirits') return cat.includes('whiskey') || cat.includes('vodka') || cat.includes('rum') || cat.includes('gin') || cat.includes('liquor');
        if (searchDept === 'Wine') return cat.includes('wine');
        if (searchDept === 'Beer') return cat.includes('beer');
        if (searchDept === 'Soft Drinks') return cat.includes('soft') || cat.includes('energy');
        if (searchDept === 'Snacks') return cat.includes('snack') || cat.includes('cigrate') || cat.includes('tobacco');
        return true;
      });
    }

    // Origin Checkbox Filter
    if (selectedOrigins.size > 0) {
      filtered = filtered.filter(p => selectedOrigins.has(p.origin));
    }

    // Volume Checkbox Filter
    if (selectedVolumes.size > 0) {
      filtered = filtered.filter(p => {
        const v = p.volume_ml ? `${p.volume_ml} ml` : (p.unit || 'Standard Bottle');
        return selectedVolumes.has(v);
      });
    }

    // Search Query Filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery) || 
        (p.category && p.category.toLowerCase().includes(searchQuery)) ||
        (p.origin && p.origin.toLowerCase().includes(searchQuery)) ||
        (p.barcode && String(p.barcode).includes(searchQuery))
      );
    }

    // Price Range Filter
    if (selectedPriceRange !== 'ALL') {
      const [minStr, maxStr] = selectedPriceRange.split('-');
      const min = parseFloat(minStr) || 0;
      const max = parseFloat(maxStr) || 999999;
      filtered = filtered.filter(p => {
        const price = parseFloat(p.selling_price || 0);
        return price >= min && price <= max;
      });
    }

    // Rating Checkbox (4.5 & up)
    if (chkRating45 && chkRating45.checked) {
      filtered = filtered.filter(p => (p.rating || 0) >= 4.5);
    }

    // Staff Pick Checkbox
    if (chkStaffPick && chkStaffPick.checked) {
      filtered = filtered.filter(p => p.is_staff_pick);
    }

    // Mix 6 Eligible Checkbox
    if (chkMix6Only && chkMix6Only.checked) {
      filtered = filtered.filter(p => p.is_mix6_eligible);
    }

    // In Stock Only
    if (chkInStockOnly && chkInStockOnly.checked) {
      filtered = filtered.filter(p => (p.stock_qty || 0) > 0);
    }

    // Pack Deals Only
    if (chkPackDealsOnly && chkPackDealsOnly.checked) {
      filtered = filtered.filter(p => p.pack_price && p.pack_price > 0);
    }

    // Sorting Engine
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
    } else if (sortBy === 'rating-desc') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'savings-desc') {
      filtered.sort((a, b) => (b.savings || 0) - (a.savings || 0));
    } else {
      // Featured: Staff picks & high ratings first
      filtered.sort((a, b) => {
        if (a.is_staff_pick && !b.is_staff_pick) return -1;
        if (!a.is_staff_pick && b.is_staff_pick) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    // Update Counter & Active Filter Pills
    if (catalogItemCount) {
      catalogItemCount.innerHTML = `Showing <strong>${filtered.length}</strong> items <span>(from 134 in stock)</span>`;
    }
    renderActiveFilterPills();

    // Empty State
    if (filtered.length === 0) {
      productGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #FFFFFF; border: 1px dashed var(--border-medium); border-radius: var(--radius-md); color: var(--text-muted);">
          <div style="font-size: 48px; margin-bottom: 14px;">🔍</div>
          <h3 style="color: var(--text-primary); font-size: 18px; font-weight: 800; margin-bottom: 6px;">No products match your filters</h3>
          <p style="font-size: 13.5px; max-width: 360px; margin: 0 auto 18px auto;">
            Try clearing select filter checkboxes or search for another whiskey, beer, or wine brand.
          </p>
          <button type="button" class="btn-tw-add-cart" id="emptyStateResetBtn" style="max-width: 200px; margin: 0 auto;">
            Clear All Filters
          </button>
        </div>
      `;
      document.getElementById('emptyStateResetBtn')?.addEventListener('click', resetAllFilters);
      return;
    }

    // Render High-Density Total Wine Product Cards
    productGrid.innerHTML = filtered.map(p => renderProductCard(p)).join('');

    // Attach Listeners to Card Buttons
    productGrid.querySelectorAll('.btn-tw-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prodId = parseInt(btn.getAttribute('data-id'));
        const product = allProducts.find(x => x.id === prodId);
        if (product) window.cart.addItem(product);
      });
    });

    productGrid.querySelectorAll('.tw-stepper-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prodId = parseInt(btn.getAttribute('data-id'));
        const delta = parseInt(btn.getAttribute('data-delta'));
        window.cart.updateQty(prodId, delta);
      });
    });

    // Quick View Triggers
    productGrid.querySelectorAll('.card-product-title, .card-img-container').forEach(el => {
      el.addEventListener('click', () => {
        const prodId = parseInt(el.getAttribute('data-id'));
        const product = allProducts.find(x => x.id === prodId);
        if (product) openQuickViewModal(product);
      });
    });
  }

  /**
   * Render single Total Wine Product Card
   */
  function renderProductCard(p) {
    const cartItem = window.cart.items.find(i => i.id === p.id);
    const inCartQty = cartItem ? cartItem.qty : 0;
    const stock = p.stock_qty || 0;
    const volLabel = p.volume_ml ? `${p.volume_ml} ml` : (p.unit || 'Standard Bottle');

    // Badges Row
    let badgesHTML = '';
    if (p.is_staff_pick) {
      badgesHTML += `<span class="tw-badge-staff-pick">Staff Pick</span>`;
    }
    if (p.points > 0) {
      badgesHTML += `<span class="tw-badge-points">${p.points} Pts</span>`;
    }
    if (p.is_mix6_eligible) {
      badgesHTML += `<span class="tw-badge-mix6">Mix 6 Eligible</span>`;
    }

    // Star string
    const fullStars = Math.floor(p.rating || 4);
    const starString = '★'.repeat(fullStars) + (p.rating % 1 >= 0.5 ? '½' : '');

    // Fulfillment indicators
    const isInStock = stock > 0;
    const stockBadge = isInStock 
      ? `<div class="fulfillment-item in-stock"><span>✓</span> In Stock • ${p.aisle}</div>`
      : `<div class="fulfillment-item out-stock"><span>✕</span> Temporarily Out of Stock</div>`;

    const deliveryBadge = `<div class="fulfillment-item delivery"><span>🛵</span> Lalitpur Delivery Available</div>`;

    // Pricing & Savings
    const savingsHTML = p.savings > 0 
      ? `<span class="card-savings-pill">Save Rs. ${p.savings.toLocaleString()} (15% Off)</span>`
      : '';

    return `
      <article class="tw-product-card" data-id="${p.id}" tabindex="0" aria-label="${p.name}">
        <div>
          <!-- Badges Header -->
          <div class="card-badges-row">
            ${badgesHTML}
          </div>

          <!-- Product Image Box -->
          <div class="card-img-container" data-id="${p.id}" title="Click for Quick View">
            <span class="card-bottle-icon">${p.bottle_icon}</span>
            <span class="card-quick-view-overlay">Quick View 👁️</span>
          </div>

          <!-- Metadata -->
          <div class="card-origin-text">${p.origin} • ${p.type_desc}</div>
          <h3 class="card-product-title" data-id="${p.id}" title="${p.name}">${p.name}</h3>
          <div class="card-volume-sku">${volLabel} • Item #${p.id}</div>

          <!-- Ratings -->
          <div class="card-rating-row">
            <span class="stars-gold">${starString}</span>
            <span class="review-count">(${p.reviews_count})</span>
          </div>

          <!-- Fulfillment Indicators -->
          <div class="fulfillment-indicators-col">
            ${stockBadge}
            ${deliveryBadge}
          </div>
        </div>

        <div>
          <!-- Pricing -->
          <div class="card-pricing-box">
            <div class="price-main-row">
              <span class="card-price-primary">Rs. ${(p.selling_price || 0).toLocaleString()}</span>
              ${p.savings > 0 ? `<span class="card-price-msrp">Rs. ${p.msrp.toLocaleString()}</span>` : ''}
            </div>
            ${savingsHTML}
          </div>

          <!-- Action Button or Stepper -->
          <div class="card-action-row">
            ${!isInStock ? `
              <button type="button" class="btn-tw-add-cart" disabled>Out of Stock</button>
            ` : inCartQty > 0 ? `
              <div class="tw-card-stepper" aria-label="Item quantity stepper">
                <button type="button" class="tw-stepper-btn" data-id="${p.id}" data-delta="-1" aria-label="Decrease quantity">−</button>
                <span class="tw-stepper-val" aria-live="polite">${inCartQty} in cart</span>
                <button type="button" class="tw-stepper-btn" data-id="${p.id}" data-delta="1" aria-label="Increase quantity">+</button>
              </div>
            ` : `
              <button type="button" class="btn-tw-add-cart" data-id="${p.id}">
                <span>+ Add to Cart</span>
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Render Active Filter Tag Pills
   */
  function renderActiveFilterPills() {
    if (!activeFiltersBox) return;

    const pills = [];

    selectedDepartments.forEach(d => {
      pills.push({ label: `Dept: ${d}`, remove: () => { selectedDepartments.delete(d); syncCheckboxes(); } });
    });

    selectedOrigins.forEach(o => {
      pills.push({ label: `Origin: ${o}`, remove: () => { selectedOrigins.delete(o); syncCheckboxes(); } });
    });

    selectedVolumes.forEach(v => {
      pills.push({ label: `Size: ${v}`, remove: () => { selectedVolumes.delete(v); syncCheckboxes(); } });
    });

    if (selectedPriceRange !== 'ALL') {
      pills.push({ label: `Price: ${selectedPriceRange}`, remove: () => { selectedPriceRange = 'ALL'; document.querySelector('input[name="priceRange"][value="ALL"]').checked = true; } });
    }

    if (chkRating45 && chkRating45.checked) {
      pills.push({ label: 'Rating: 4.5+ ★', remove: () => { chkRating45.checked = false; } });
    }

    if (chkStaffPick && chkStaffPick.checked) {
      pills.push({ label: 'Staff Picks 🏆', remove: () => { chkStaffPick.checked = false; } });
    }

    if (chkMix6Only && chkMix6Only.checked) {
      pills.push({ label: 'Mix 6 Eligible 🏷️', remove: () => { chkMix6Only.checked = false; } });
    }

    if (searchQuery) {
      pills.push({ label: `Search: "${searchQuery}"`, remove: () => { searchQuery = ''; if (searchInput) searchInput.value = ''; } });
    }

    if (pills.length === 0) {
      activeFiltersBox.style.display = 'none';
      activeFiltersBox.innerHTML = '';
      return;
    }

    activeFiltersBox.style.display = 'flex';
    activeFiltersBox.innerHTML = pills.map((p, idx) => `
      <div class="active-filter-pill">
        <span>${p.label}</span>
        <button type="button" data-pill-idx="${idx}" aria-label="Remove filter">×</button>
      </div>
    `).join('');

    activeFiltersBox.querySelectorAll('[data-pill-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-pill-idx'));
        if (pills[idx]) {
          pills[idx].remove();
          filterAndRender();
        }
      });
    });
  }

  function syncCheckboxes() {
    document.querySelectorAll('.chk-dept').forEach(chk => {
      chk.checked = selectedDepartments.has(chk.value);
    });
    document.querySelectorAll('.chk-origin').forEach(chk => {
      chk.checked = selectedOrigins.has(chk.value);
    });
    document.querySelectorAll('.chk-volume').forEach(chk => {
      chk.checked = selectedVolumes.has(chk.value);
    });
  }

  function resetAllFilters() {
    selectedDepartments.clear();
    selectedOrigins.clear();
    selectedVolumes.clear();
    selectedPriceRange = 'ALL';
    searchQuery = '';
    searchDept = 'ALL';
    if (searchInput) searchInput.value = '';
    if (searchDeptSelect) searchDeptSelect.value = 'ALL';
    syncCheckboxes();
    document.querySelectorAll('input[name="priceRange"]').forEach((r, idx) => {
      r.checked = idx === 0;
    });
    if (chkRating45) chkRating45.checked = false;
    if (chkStaffPick) chkStaffPick.checked = false;
    if (chkMix6Only) chkMix6Only.checked = false;
    if (chkInStockOnly) chkInStockOnly.checked = false;
    if (chkPackDealsOnly) chkPackDealsOnly.checked = false;
    filterAndRender();
  }

  /**
   * Product Quick View Modal
   */
  function openQuickViewModal(product) {
    if (!quickViewModal || !quickViewCardContent) return;

    const cartItem = window.cart.items.find(i => i.id === product.id);
    const inCartQty = cartItem ? cartItem.qty : 0;
    const stock = product.stock_qty || 0;
    const volLabel = product.volume_ml ? `${product.volume_ml} ml` : (product.unit || 'Standard Bottle');

    quickViewCardContent.innerHTML = `
      <div class="modal-header-row">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--tw-burgundy); text-transform: uppercase;">${product.origin} • ${product.category}</span>
          <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-top: 4px;">${product.name}</h2>
        </div>
        <button type="button" class="cart-drawer-close-btn" id="closeQuickViewModalBtn" style="color: var(--text-primary);">×</button>
      </div>

      <div style="display: grid; grid-template-columns: 140px 1fr; gap: 20px; align-items: center; margin-bottom: 20px;">
        <div style="background: #FAF5F6; border-radius: var(--radius-md); height: 160px; display: flex; align-items: center; justify-content: center; font-size: 76px;">
          ${product.bottle_icon}
        </div>
        <div>
          <div style="font-size: 24px; font-weight: 900; color: var(--tw-burgundy); margin-bottom: 4px;">
            Rs. ${(product.selling_price || 0).toLocaleString()}
            ${product.savings > 0 ? `<span style="font-size: 13px; color: var(--text-muted); text-decoration: line-through; margin-left: 8px;">Rs. ${product.msrp.toLocaleString()}</span>` : ''}
          </div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 12px;">
            Bottle Size: <strong>${volLabel}</strong> • Store Location: <strong>${product.aisle}</strong>
          </div>
          <div style="font-size: 12.5px; color: ${stock > 0 ? 'var(--tw-green)' : 'var(--tw-red)'}; font-weight: 700;">
            ${stock > 0 ? `✓ In Stock (${stock} bottles available at counter till)` : '✕ Sold Out at Counter'}
          </div>
        </div>
      </div>

      <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
        Authentic spirits inventory directly synchronized with our Lalitpur store register. ${product.is_mix6_eligible ? 'Qualifies for 10% Mix 6 discount when purchasing 6 or more bottles.' : ''}
      </p>

      <div style="display: flex; gap: 12px;">
        <button type="button" class="btn-tw-checkout" id="quickViewAddBtn" style="margin-top: 0; flex: 2;" ${stock <= 0 ? 'disabled' : ''}>
          ${stock <= 0 ? 'Sold Out' : (inCartQty > 0 ? `In Cart (${inCartQty}) • Add Another` : `+ Add to Cart (Rs. ${(product.selling_price || 0).toLocaleString()})`)}
        </button>
        <button type="button" class="btn-tw-add-cart" id="quickViewOpenCartBtn" style="flex: 1; justify-content: center;">
          View Cart (${window.cart.getItemCount()})
        </button>
      </div>
    `;

    quickViewModal.classList.add('open');

    document.getElementById('closeQuickViewModalBtn')?.addEventListener('click', closeQuickViewModal);
    document.getElementById('quickViewOpenCartBtn')?.addEventListener('click', () => {
      closeQuickViewModal();
      openCartDrawer();
    });

    document.getElementById('quickViewAddBtn')?.addEventListener('click', () => {
      if (stock > 0) {
        window.cart.addItem(product);
        closeQuickViewModal();
      }
    });
  }

  function closeQuickViewModal() {
    if (quickViewModal) quickViewModal.classList.remove('open');
  }

  if (quickViewModal) {
    quickViewModal.addEventListener('click', (e) => {
      if (e.target === quickViewModal) closeQuickViewModal();
    });
  }

  // Keyboard accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickViewModal();
      closeStoreSelectorModal();
      closeCartDrawer();
      closeMobileFilterDrawer();
    }
  });

  /**
   * Store Selector Modal Setup
   */
  function setupStoreSelectorModal() {
    if (openStoreSelectorBtn) openStoreSelectorBtn.addEventListener('click', openStoreSelectorModal);
    if (closeStoreModalBtn) closeStoreModalBtn.addEventListener('click', closeStoreSelectorModal);

    document.querySelectorAll('.store-option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.store-option-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    if (btnConfirmStoreSelection) {
      btnConfirmStoreSelection.addEventListener('click', () => {
        const activeCard = document.querySelector('.store-option-card.active');
        const storeType = activeCard?.getAttribute('data-store');
        if (currentStoreNameText) {
          currentStoreNameText.textContent = storeType === 'Kathmandu' 
            ? 'Kathmandu Express Hub' 
            : 'Lalitpur Superstore (Mahalaxmi)';
        }
        closeStoreSelectorModal();
        window.cart.showToast(`Active Store: ${currentStoreNameText.textContent}`);
      });
    }

    if (storeSelectorModal) {
      storeSelectorModal.addEventListener('click', (e) => {
        if (e.target === storeSelectorModal) closeStoreSelectorModal();
      });
    }
  }

  function openStoreSelectorModal() {
    if (storeSelectorModal) storeSelectorModal.classList.add('open');
  }

  function closeStoreSelectorModal() {
    if (storeSelectorModal) storeSelectorModal.classList.remove('open');
  }

  /**
   * Hero Fulfillment Chips Setup
   */
  function setupFulfillmentChips() {
    const chips = [chipPickup, chipDelivery, chipCurbside];
    chips.forEach(chip => {
      chip?.addEventListener('click', () => {
        chips.forEach(c => {
          c?.classList.remove('active');
          c?.setAttribute('aria-checked', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-checked', 'true');

        if (chip === chipPickup) window.cart.fulfillment = 'PICKUP';
        if (chip === chipDelivery) window.cart.fulfillment = 'DELIVERY';
        if (chip === chipCurbside) window.cart.fulfillment = 'CURBSIDE';

        window.cart.updateBadges();
        window.cart.showToast(`Fulfillment set to: ${chip.textContent.trim()}`);
      });
    });
  }

  /**
   * Mega Menu Quick Filter Triggers
   */
  function setupMegaMenuTriggers() {
    document.querySelectorAll('.filter-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = trigger.getAttribute('data-cat');
        const q = trigger.getAttribute('data-query');

        resetAllFilters();

        if (cat) {
          selectedDepartments.add(cat);
          syncCheckboxes();
        }
        if (q && searchInput) {
          searchInput.value = q;
          searchQuery = q.toLowerCase();
        }

        filterAndRender();
        closeMobileNavDrawer();
        document.getElementById('mainCatalogArea')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.querySelectorAll('.deal-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const deal = trigger.getAttribute('data-deal');
        resetAllFilters();

        if (deal === 'mix6' && chkMix6Only) chkMix6Only.checked = true;
        if (deal === 'staff-pick' && chkStaffPick) chkStaffPick.checked = true;
        if (deal === 'top-rated' && chkRating45) chkRating45.checked = true;

        filterAndRender();
        closeMobileNavDrawer();
        document.getElementById('mainCatalogArea')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.querySelectorAll('.price-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const min = trigger.getAttribute('data-min') || '0';
        const max = trigger.getAttribute('data-max') || '999999';
        selectedPriceRange = `${min}-${max}`;
        filterAndRender();
        closeMobileNavDrawer();
        document.getElementById('mainCatalogArea')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /**
   * Mobile Filter Drawer Setup
   */
  function setupMobileFilterDrawer() {
    if (openMobileFilterBtn) {
      openMobileFilterBtn.addEventListener('click', () => {
        // Clone sidebar into mobile drawer
        const sidebar = document.getElementById('filterSidebar');
        if (sidebar && mobileFilterDrawerContent) {
          mobileFilterDrawerContent.innerHTML = sidebar.innerHTML;
          // Re-bind cloned checkboxes
          bindMobileClonedFilters();
        }
        if (mobileFilterDrawer) mobileFilterDrawer.classList.add('open');
      });
    }

    if (closeMobileFilterBtn) {
      closeMobileFilterBtn.addEventListener('click', closeMobileFilterDrawer);
    }

    if (btnMobileApplyFilters) {
      btnMobileApplyFilters.addEventListener('click', () => {
        closeMobileFilterDrawer();
        filterAndRender();
      });
    }

    if (btnMobileClearAll) {
      btnMobileClearAll.addEventListener('click', () => {
        resetAllFilters();
        closeMobileFilterDrawer();
      });
    }
  }

  function bindMobileClonedFilters() {
    if (!mobileFilterDrawerContent) return;
    mobileFilterDrawerContent.querySelectorAll('.chk-dept').forEach(chk => {
      chk.checked = selectedDepartments.has(chk.value);
      chk.addEventListener('change', () => {
        if (chk.checked) selectedDepartments.add(chk.value);
        else selectedDepartments.delete(chk.value);
      });
    });
    mobileFilterDrawerContent.querySelectorAll('.chk-origin').forEach(chk => {
      chk.checked = selectedOrigins.has(chk.value);
      chk.addEventListener('change', () => {
        if (chk.checked) selectedOrigins.add(chk.value);
        else selectedOrigins.delete(chk.value);
      });
    });
    mobileFilterDrawerContent.querySelectorAll('.chk-volume').forEach(chk => {
      chk.checked = selectedVolumes.has(chk.value);
      chk.addEventListener('change', () => {
        if (chk.checked) selectedVolumes.add(chk.value);
        else selectedVolumes.delete(chk.value);
      });
    });
  }

  function closeMobileFilterDrawer() {
    if (mobileFilterDrawer) mobileFilterDrawer.classList.remove('open');
  }

  /**
   * Slide-out Mobile Navigation Drawer Setup
   */
  function setupMobileNavDrawer() {
    if (openMobileNavBtn) {
      openMobileNavBtn.addEventListener('click', () => {
        if (mobileNavDrawer) mobileNavDrawer.classList.add('open');
      });
    }

    if (closeMobileNavBtn) {
      closeMobileNavBtn.addEventListener('click', closeMobileNavDrawer);
    }

    if (mobileNavDrawer) {
      mobileNavDrawer.addEventListener('click', (e) => {
        if (e.target === mobileNavDrawer) {
          closeMobileNavDrawer();
        }
      });

      // Links inside mobile nav drawer close it smoothly
      mobileNavDrawer.querySelectorAll('.mobile-nav-link-item').forEach(link => {
        link.addEventListener('click', () => {
          closeMobileNavDrawer();
        });
      });
    }

    if (mobileDrawerStoreChangeBtn) {
      mobileDrawerStoreChangeBtn.addEventListener('click', () => {
        closeMobileNavDrawer();
        openStoreSelectorModal();
      });
    }
  }

  function closeMobileNavDrawer() {
    if (mobileNavDrawer) mobileNavDrawer.classList.remove('open');
  }

  /**
   * Cart Drawer Rendering & Form Handling
   */
  function openCartDrawer() {
    renderCartDrawer();
    if (cartDrawerOverlay) cartDrawerOverlay.classList.add('open');
  }

  function closeCartDrawer() {
    if (cartDrawerOverlay) cartDrawerOverlay.classList.remove('open');
  }

  function renderCartDrawer() {
    const drawerContainer = document.getElementById('cartDrawerContainer');
    if (!drawerContainer) return;

    const items = window.cart.items;
    const subtotal = window.cart.getSubtotal();
    const mix6Discount = window.cart.getMix6Discount();
    const deliveryFee = window.cart.getDeliveryFee();
    const total = window.cart.getTotal();
    const fulfillment = window.cart.fulfillment;
    const paymentMode = window.cart.paymentMode;
    const mix6Count = window.cart.getMix6BottleCount();
    const isMix6Active = window.cart.isMix6Unlocked();

    if (items.length === 0) {
      drawerContainer.innerHTML = `
        <div class="cart-drawer-header">
          <h3 class="cart-drawer-title">Shopping Cart (0)</h3>
          <button type="button" class="cart-drawer-close-btn" id="closeDrawerInnerBtn">×</button>
        </div>
        <div class="cart-drawer-body" style="align-items: center; justify-content: center; text-align: center; color: var(--text-muted); padding: 50px 20px;">
          <div style="font-size: 54px; margin-bottom: 14px;">🛒</div>
          <h4 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">Your Cart is Empty</h4>
          <p style="font-size: 13.5px; max-width: 260px; line-height: 1.5; margin-bottom: 20px;">
            Explore our single malts, craft beers, and fine wines to draft an order.
          </p>
          <button type="button" class="btn-tw-add-cart" id="startBrowsingBtn" style="max-width: 200px;">
            Start Shopping
          </button>
        </div>
      `;
      document.getElementById('closeDrawerInnerBtn')?.addEventListener('click', closeCartDrawer);
      document.getElementById('startBrowsingBtn')?.addEventListener('click', closeCartDrawer);
      return;
    }

    // Mix 6 Strip inside cart
    const mix6CartBanner = `
      <div style="background: ${isMix6Active ? '#ECFDF5' : '#FFFBEB'}; border: 1px solid ${isMix6Active ? '#A7F3D0' : '#FDE68A'}; border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12.5px;">
        <div style="font-weight: 800; color: ${isMix6Active ? 'var(--tw-green)' : '#92400E'};">
          ${isMix6Active ? '🎉 10% Mix 6 Discount Applied!' : `🏷️ Mix 6 Progress: ${mix6Count} of 6 Qualifying Bottles`}
        </div>
        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
          ${isMix6Active ? `You saved Rs. ${mix6Discount.toLocaleString()} on qualifying bottles!` : `Add ${6 - mix6Count} more wine or spirits bottles to unlock 10% savings.`}
        </div>
      </div>
    `;

    drawerContainer.innerHTML = `
      <div class="cart-drawer-header">
        <h3 class="cart-drawer-title">
          <span>Shopping Cart</span>
          <span style="font-size: 13px; font-weight: 600; opacity: 0.9;">(${window.cart.getItemCount()} items)</span>
        </h3>
        <button type="button" class="cart-drawer-close-btn" id="closeDrawerInnerBtn">×</button>
      </div>

      <div class="cart-drawer-body">
        ${mix6CartBanner}

        <!-- Fulfillment Mode Selection -->
        <div>
          <label style="display: block; font-size: 12.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
            Fulfillment Preference:
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="fulfillment-chip ${fulfillment === 'PICKUP' ? 'active' : ''}" id="tabPickup" style="justify-content: center; border-radius: var(--radius-sm); background: ${fulfillment === 'PICKUP' ? 'var(--tw-burgundy)' : '#F4F4F5'}; color: ${fulfillment === 'PICKUP' ? '#FFF' : 'var(--text-primary)'};">
              🚶 Store Pickup
            </button>
            <button type="button" class="fulfillment-chip ${fulfillment === 'DELIVERY' ? 'active' : ''}" id="tabDelivery" style="justify-content: center; border-radius: var(--radius-sm); background: ${fulfillment === 'DELIVERY' ? 'var(--tw-burgundy)' : '#F4F4F5'}; color: ${fulfillment === 'DELIVERY' ? '#FFF' : 'var(--text-primary)'};">
              🛵 Lalitpur Delivery
            </button>
          </div>
        </div>

        <!-- Cart Items -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${items.map(item => `
            <div class="cart-item-card">
              <span class="cart-item-bottle-icon">🍷</span>
              <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price-calc">Rs. ${item.price.toLocaleString()} × ${item.qty} = Rs. ${(item.price * item.qty).toLocaleString()}</div>
              </div>
              <div class="tw-card-stepper" style="max-width: 90px; height: 32px;">
                <button type="button" class="tw-stepper-btn" data-cart-id="${item.id}" data-delta="-1">−</button>
                <span class="tw-stepper-val">${item.qty}</span>
                <button type="button" class="tw-stepper-btn" data-cart-id="${item.id}" data-delta="1">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Customer Phone & Details Form -->
        <div style="background: #F8F9FA; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;" for="cartPhoneInput">
              Your Mobile Phone (for WhatsApp Order Updates)*
            </label>
            <input type="tel" id="cartPhoneInput" class="newsletter-input" style="background: #FFFFFF; border: 1px solid var(--border-medium); color: var(--text-primary);" placeholder="e.g. 9851133129" value="${window.cart.customerPhone || ''}" required />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;" for="cartNameInput">
              Customer Name
            </label>
            <input type="text" id="cartNameInput" class="newsletter-input" style="background: #FFFFFF; border: 1px solid var(--border-medium); color: var(--text-primary);" placeholder="e.g. Suman Bhandari" value="${window.cart.customerName || ''}" />
          </div>

          ${fulfillment === 'DELIVERY' ? `
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;" for="cartZoneSelect">
                Lalitpur Delivery Zone
              </label>
              <select id="cartZoneSelect" class="newsletter-input" style="background: #FFFFFF; border: 1px solid var(--border-medium); color: var(--text-primary);">
                ${window.KASK_CONFIG.ALLOWED_DELIVERY_ZONES.map(z => `
                  <option value="${z}" ${z === window.cart.deliveryZone ? 'selected' : ''}>${z}</option>
                `).join('')}
              </select>
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;" for="cartAddressInput">
                Exact Street / Landmark Address*
              </label>
              <input type="text" id="cartAddressInput" class="newsletter-input" style="background: #FFFFFF; border: 1px solid var(--border-medium); color: var(--text-primary);" placeholder="e.g. Near Mahalaxmi School, Ward 4" value="${window.cart.deliveryAddress || ''}" required />
            </div>
          ` : `
            <div style="font-size: 12px; color: var(--tw-burgundy); background: #FDF2F4; padding: 8px 12px; border-radius: var(--radius-xs); border: 1px solid var(--tw-burgundy-border);">
              📍 Free 2-Hour Pickup at Total Wine / KASK Mart Counter (Mahalaxmi). 4-digit verification code will be generated upon approval.
            </div>
          `}

          <!-- Notes -->
          <div style="margin-top: 10px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;" for="cartNotesInput">
              Special Instructions
            </label>
            <input type="text" id="cartNotesInput" class="newsletter-input" style="background: #FFFFFF; border: 1px solid var(--border-medium); color: var(--text-primary);" placeholder="e.g. Keep beer cold, call upon arrival" value="${window.cart.orderNotes || ''}" />
          </div>
        </div>

        <!-- Payment Method Selection -->
        <div>
          <label style="display: block; font-size: 12.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
            Payment Method upon Approval:
          </label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <button type="button" class="tab-btn ${paymentMode === 'FONEPAY_QR' ? 'active' : ''}" data-mode="FONEPAY_QR" style="border-radius: var(--radius-sm); padding: 8px 4px; font-size: 12px; border: 1.5px solid ${paymentMode === 'FONEPAY_QR' ? 'var(--tw-burgundy)' : 'var(--border-medium)'}; background: ${paymentMode === 'FONEPAY_QR' ? '#FDF2F4' : '#FFF'}; color: ${paymentMode === 'FONEPAY_QR' ? 'var(--tw-burgundy)' : 'var(--text-primary)'}; font-weight: 700;">
              📱 FonePay QR
            </button>
            <button type="button" class="tab-btn ${paymentMode === 'KHATA' ? 'active' : ''}" data-mode="KHATA" style="border-radius: var(--radius-sm); padding: 8px 4px; font-size: 12px; border: 1.5px solid ${paymentMode === 'KHATA' ? 'var(--tw-gold)' : 'var(--border-medium)'}; background: ${paymentMode === 'KHATA' ? 'var(--tw-gold-soft)' : '#FFF'}; color: ${paymentMode === 'KHATA' ? 'var(--tw-gold-dark)' : 'var(--text-primary)'}; font-weight: 700;">
              📓 Khata Credit
            </button>
            <button type="button" class="tab-btn ${paymentMode === 'CASH' ? 'active' : ''}" data-mode="CASH" style="border-radius: var(--radius-sm); padding: 8px 4px; font-size: 12px; border: 1.5px solid ${paymentMode === 'CASH' ? 'var(--tw-burgundy)' : 'var(--border-medium)'}; background: ${paymentMode === 'CASH' ? '#FDF2F4' : '#FFF'}; color: ${paymentMode === 'CASH' ? 'var(--tw-burgundy)' : 'var(--text-primary)'}; font-weight: 700;">
              💵 Cash
            </button>
          </div>
        </div>

      </div>

      <!-- Footer & Submit -->
      <div class="cart-drawer-footer">
        <div class="cart-summary-line">
          <span>Items Subtotal</span>
          <span>Rs. ${subtotal.toLocaleString()}</span>
        </div>
        ${mix6Discount > 0 ? `
          <div class="cart-summary-line" style="color: var(--tw-green); font-weight: 700;">
            <span>Mix 6 Savings (10%)</span>
            <span>− Rs. ${mix6Discount.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="cart-summary-line">
          <span>Delivery Fee</span>
          <span>${deliveryFee === 0 ? '<strong style="color: var(--tw-green);">FREE</strong>' : `Rs. ${deliveryFee.toLocaleString()}`}</span>
        </div>
        <div class="cart-summary-line total">
          <span>Total Order Due</span>
          <span style="color: var(--tw-burgundy);">Rs. ${total.toLocaleString()}</span>
        </div>

        <button type="button" class="btn-tw-checkout" id="btnSubmitDraft">
          Send Draft to Store for Approval →
        </button>
      </div>
    `;

    // Drawer Event Listeners
    document.getElementById('closeDrawerInnerBtn')?.addEventListener('click', closeCartDrawer);

    document.getElementById('tabPickup')?.addEventListener('click', () => {
      window.cart.fulfillment = 'PICKUP';
      renderCartDrawer();
    });

    document.getElementById('tabDelivery')?.addEventListener('click', () => {
      window.cart.fulfillment = 'DELIVERY';
      renderCartDrawer();
    });

    drawerContainer.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.cart.paymentMode = btn.getAttribute('data-mode');
        renderCartDrawer();
      });
    });

    drawerContainer.querySelectorAll('[data-cart-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-cart-id'));
        const delta = parseInt(btn.getAttribute('data-delta'));
        window.cart.updateQty(id, delta);
      });
    });

    // Inputs Sync
    const phoneInput = document.getElementById('cartPhoneInput');
    const nameInput = document.getElementById('cartNameInput');
    const addressInput = document.getElementById('cartAddressInput');
    const zoneSelect = document.getElementById('cartZoneSelect');
    const notesInput = document.getElementById('cartNotesInput');

    phoneInput?.addEventListener('input', (e) => { window.cart.customerPhone = e.target.value; });
    nameInput?.addEventListener('input', (e) => { window.cart.customerName = e.target.value; });
    addressInput?.addEventListener('input', (e) => { window.cart.deliveryAddress = e.target.value; });
    zoneSelect?.addEventListener('change', (e) => { window.cart.deliveryZone = e.target.value; });
    notesInput?.addEventListener('input', (e) => { window.cart.orderNotes = e.target.value; });

    // Submit Action
    document.getElementById('btnSubmitDraft')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnSubmitDraft');
      try {
        btn.disabled = true;
        btn.innerHTML = `<span style="animation: pulse 1s infinite;">⏳</span> Drafting Invoice & Transmitting to Store...`;
        const draft = await window.cart.submitDraftOrder();
        closeCartDrawer();
        window.location.href = `track.html?code=${draft.order_code}`;
      } catch (err) {
        alert(err.message || "Could not submit order");
        btn.disabled = false;
        btn.textContent = "Send Draft to Store for Approval →";
      }
    });
  }

  /**
   * Shimmer Skeleton Loaders
   */
  function renderSkeletons(count = 8) {
    if (!productGrid) return;
    const skeletonHTML = `
      <div class="tw-card-skeleton">
        <div>
          <div style="display: flex; gap: 6px; margin-bottom: 10px;">
            <div class="tw-skeleton-box" style="width: 70px; height: 16px;"></div>
            <div class="tw-skeleton-box" style="width: 50px; height: 16px;"></div>
          </div>
          <div class="tw-skeleton-box" style="width: 100%; height: 150px; margin-bottom: 12px;"></div>
          <div class="tw-skeleton-box" style="width: 40%; height: 12px; margin-bottom: 6px;"></div>
          <div class="tw-skeleton-box" style="width: 90%; height: 18px; margin-bottom: 6px;"></div>
          <div class="tw-skeleton-box" style="width: 60%; height: 14px; margin-bottom: 12px;"></div>
        </div>
        <div>
          <div class="tw-skeleton-box" style="width: 50%; height: 22px; margin-bottom: 10px;"></div>
          <div class="tw-skeleton-box" style="width: 100%; height: 38px; border-radius: 6px;"></div>
        </div>
      </div>
    `;
    productGrid.innerHTML = skeletonHTML.repeat(count);
  }
});
