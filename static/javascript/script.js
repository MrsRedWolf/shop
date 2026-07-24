// ============================================
// API HELPER
// ============================================
const API_URL = '';
let authToken = localStorage.getItem('auth_token');

async function api(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(API_URL + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Ошибка запроса');
  }
  return res.json();
}

// ============================================
// GLOBAL STATE
// ============================================
let products = [];
let cart = [];
let favorites = [];
let orders = [];
let addresses = [];
let paymentMethods = [];

let currentUser = null;
let currentCategory = 'all';
let currentSort = 'popular';
let searchQuery = '';
let modalProductId = null;
let modalQty = 1;
let modalSelectedSize = null;
let priceMin = null;
let priceMax = null;
let sizeFilter = '';
let productsLoaded = false;

const isCabinetPage = document.getElementById('cabinetContent') !== null;

// ============================================
// TOAST (ОБЩАЯ ДЛЯ ВСЕХ СТРАНИЦ)
// ============================================
function showToast(message, icon = 'check-circle') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast flex items-center gap-3 bg-onSurface-primary text-white px-5 py-3.5 rounded-2xl m3-expressive-shadow-lg font-medium text-sm';
  toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 text-green-400 flex-shrink-0"></i>${message}`;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => toast.remove(), 3000);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (authToken) {
      currentUser = await api('/api/me');
    }
  } catch (e) {
    localStorage.removeItem('auth_token');
    authToken = null;
  }

  await fetchProducts();
  await fetchFavorites();
  await renderCategoryChips();
  if (authToken) {
    await fetchCart();
    await fetchOrders();
    await fetchAddresses();
    await fetchPaymentMethods();
  }

  renderProducts();
  lucide.createIcons();
  initHeroSlider();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderProducts();
    });
  }
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderProducts();
    });
  }

  document.addEventListener('click', (e) => {
    const sortBtn = e.target.closest('[onclick*="toggleSort"]');
    const sortDropdown = document.getElementById('sortDropdown');
    if (!sortBtn && sortDropdown && !sortDropdown.contains(e.target)) {
      sortDropdown.classList.add('hidden');
    }
    const userBtn = e.target.closest('#userMenuContainer');
    const userDropdown = document.getElementById('userDropdown');
    if (!userBtn && userDropdown) {
      userDropdown.classList.add('hidden');
    }
  });

  updateLoginButton();

  const userNameDisplay = document.getElementById('userNameDisplay');
  if (currentUser && userNameDisplay) {
    userNameDisplay.textContent = currentUser.name;
  }
switchCabinetTab 
  if (isCabinetPage) initCabinet();
  if (isCabinetPage) {
  if (!productsLoaded) {
    await fetchProducts();
  }
}
});

// ============================================
// DATA FETCHING
// ============================================
async function fetchProducts() {
  try {
    products = await api('/api/products');
    productsLoaded = true;
  } catch (e) {
    products = [];
  }
}

async function fetchFavorites() {
  if (!authToken) { favorites = []; return; }
  try {
    favorites = await api('/api/favorites');
  } catch (e) { favorites = []; }
}

async function fetchCart() {
  if (!authToken) { cart = []; return; }
  try {
    cart = await api('/api/cart');
  } catch (e) { cart = []; }
  updateCartUI();
}

async function fetchOrders() {
  if (!authToken) { orders = []; return; }
  try {
    orders = await api('/api/orders');
  } catch (e) { orders = []; }
}

async function fetchAddresses() {
  if (!authToken) { addresses = []; return; }
  try {
    addresses = await api('/api/addresses');
  } catch (e) { addresses = []; }
}

async function fetchPaymentMethods() {
  if (!authToken) { paymentMethods = []; return; }
  try {
    paymentMethods = await api('/api/payment-methods');
  } catch (e) { paymentMethods = []; }
}

// ============================================
// HERO SLIDER
// ============================================
function setHeroHeight() {
  const slider = document.getElementById('heroSlider');
  if (!slider) return;
  const slides = document.querySelectorAll('.hero-slide');
  const originalStyles = [];
  slides.forEach(s => {
    originalStyles.push({ display: s.style.display, position: s.style.position, visibility: s.style.visibility, opacity: s.style.opacity, transform: s.style.transform, transition: s.style.transition });
    s.style.display = 'block'; s.style.position = 'relative'; s.style.visibility = 'visible'; s.style.opacity = '1'; s.style.transform = 'none'; s.style.transition = 'none';
  });
  let maxHeight = 0;
  slides.forEach(s => { const h = s.offsetHeight; if (h > maxHeight) maxHeight = h; });
  slides.forEach((s, i) => {
    const orig = originalStyles[i];
    s.style.display = orig.display; s.style.position = orig.position; s.style.visibility = orig.visibility; s.style.opacity = orig.opacity; s.style.transform = orig.transform; s.style.transition = orig.transition;
  });
  slider.style.height = maxHeight + 'px';
}

async function initHeroSlider() {
  const slider = document.getElementById('heroSlider');
  const dotsContainer = document.getElementById('heroDots');
  if (!slider || !dotsContainer) return;

  let news = [];
  try {
    const res = await fetch('/api/news');
    if (!res.ok) throw new Error('Network error');
    news = await res.json();
  } catch (e) {
    console.error('Ошибка загрузки новостей:', e);
  }

  if (!Array.isArray(news) || news.length === 0) {
    news = [{
      title: 'Поступай в РГСУ — строим будущее вместе',
      subtitle: 'Приёмная кампания 2026',
      description: 'Передовые образовательные программы, мощная научная база и активная студенческая жизнь. Приём документов уже открыт!',
      date: '',
      link1_url: '#',
      link1_text: 'Подать документы',
      link2_url: null,
      link2_text: null,
      order: 0
    }];
  }

  slider.innerHTML = news.map((item, index) => {
    let buttonsHTML = '';
    if (item.link1_url) {
      buttonsHTML += `<a href="${item.link1_url}" class="m3-btn bg-white text-rgsu-600 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-shadow dark:bg-rgsu-500 dark:text-white">${item.link1_text || 'Подробнее'}</a>`;
    }
    if (item.link2_url) {
      buttonsHTML += `<a href="${item.link2_url}" class="m3-btn bg-white/15 backdrop-blur-sm text-white border border-white/30 px-6 py-3 rounded-2xl font-bold text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">${item.link2_text || 'Подробнее'}</a>`;
    }

    return `
      <div class="hero-slide ${index === 0 ? 'active' : ''} text-center lg:text-left" data-index="${index}">
        <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
          <i data-lucide="${index === 0 ? 'calendar' : 'newspaper'}" class="w-4 h-4 text-yellow-300"></i>
          <span class="text-white/90 text-sm font-medium">${item.subtitle || 'Новости университета'}</span>
        </div>
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          ${item.title}
        </h2>
        <p class="text-white/80 mt-4 text-base sm:text-lg max-w-lg mx-auto lg:mx-0">${item.description}</p>
        ${item.date ? `<p class="text-white/50 text-sm mt-2">${item.date}</p>` : ''}
        ${buttonsHTML ? `<div class="flex flex-wrap gap-3 mt-6 justify-center lg:justify-start">${buttonsHTML}</div>` : ''}
      </div>
    `;
  }).join('');

  dotsContainer.innerHTML = news.map((_, i) => `
    <button class="news-dot w-3 h-3 rounded-full ${i === 0 ? 'active bg-white' : 'bg-white/40'} hover:bg-white/70" data-slide="${i}"></button>
  `).join('');

  lucide.createIcons();

  const slides = slider.querySelectorAll('.hero-slide');
  const dots = dotsContainer.querySelectorAll('.news-dot');
  let current = 0;
  let interval;
  let animating = false;

  slides.forEach(s => { s.style.transition = 'none'; });
  if (slides.length > 0) {
    slides[0].style.transform = 'translateX(0)';
    slides[0].style.opacity = '1';
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      slides.forEach(s => { s.style.transition = ''; s.style.transform = ''; s.style.opacity = ''; });
      setHeroHeight();
    });
  });

  function goTo(index) {
    if (index === current || animating || slides.length === 0) return;
    animating = true;
    const currentSlide = slides[current];
    const nextSlide = slides[index];

    slides.forEach(s => {
      s.classList.remove('enter', 'leave');
      if (s !== currentSlide) s.classList.remove('active');
    });

    currentSlide.classList.add('leave');
    currentSlide.classList.remove('active');
    nextSlide.classList.add('enter');

    dots.forEach(d => d.classList.remove('active', 'bg-white'));
    dots[index].classList.add('active', 'bg-white');

    setTimeout(() => {
      currentSlide.classList.remove('leave');
      nextSlide.classList.remove('enter');
      nextSlide.classList.add('active');
      current = index;
      animating = false;
      setHeroHeight();
      resetInterval();
    }, 500);
  }

  function nextSlide() { goTo((current + 1) % slides.length); }
  function resetInterval() {
    clearInterval(interval);
    interval = setInterval(nextSlide, 5000);
  }

  dots.forEach((dot, idx) => dot.addEventListener('click', () => goTo(idx)));

  if (slides.length > 1) resetInterval();
  window.addEventListener('resize', setHeroHeight);
}
// ============================================
// RENDER PRODUCTS
// ============================================
function renderProducts() {
  let filtered = [...products];
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
  if (searchQuery) filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery) || p.description.toLowerCase().includes(searchQuery) || p.category.toLowerCase().includes(searchQuery));
  if (priceMin !== null) filtered = filtered.filter(p => p.price >= priceMin);
  if (priceMax !== null) filtered = filtered.filter(p => p.price <= priceMax);
  if (sizeFilter) filtered = filtered.filter(p => p.sizes && p.sizes.includes(sizeFilter));

  switch (currentSort) {
    case 'popular': filtered.sort((a,b) => (b.isPopular?1:0) - (a.isPopular?1:0)); break;
    case 'priceAsc': filtered.sort((a,b) => a.price - b.price); break;
    case 'priceDesc': filtered.sort((a,b) => b.price - a.price); break;
    case 'new': filtered.sort((a,b) => (b.isNew?1:0) - (a.isNew?1:0)); break;
  }

  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  document.getElementById('productCount').textContent = `Показано ${filtered.length} товар${getPlural(filtered.length)}`;

  if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  grid.innerHTML = filtered.map((product, index) => {
    const cartItem = cart.find(c => c.product_id === product.id);
    const qtyInCart = cartItem ? cartItem.qty : 0;

    return `
      <div class="product-card bg-white rounded-3xl overflow-hidden m3-expressive-shadow cursor-pointer fade-in h-full flex flex-col" data-product-id="${product.id}"
           style="animation-delay: ${index*50}ms" onclick="openProductModal(${product.id})">
        <div class="relative overflow-hidden aspect-[4/3]">
          <img src="${product.images && product.images.length ? product.images[0] : ''}" alt="${product.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" loading="lazy">
          <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
            ${product.tags.map(tag => `<span class="px-2.5 py-1 rounded-xl text-xs font-bold shadow-md ${tag === 'Новинка' ? 'bg-rgsu-500 text-white' : tag === 'Хит' ? 'bg-rgsu-red text-white' : tag.startsWith('-') ? 'bg-green-500 text-white' : 'bg-white/90 text-onSurface-primary'}">${tag}</span>`).join('')}
          </div>
          <button onclick="event.stopPropagation(); toggleFavorite(${product.id})" class="absolute top-3 right-3 m3-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-md ${favorites.includes(product.id) ? 'text-red-500' : 'text-onSurface-tertiary'}">
            <i data-lucide="${favorites.includes(product.id) ? 'heart' : 'heart'}" class="w-4 h-4 ${favorites.includes(product.id) ? 'fill-current' : ''}"></i>
          </button>
        </div>
        <div class="p-3 sm:p-4 flex flex-col flex-1">
          <p class="text-xs text-onSurface-tertiary font-medium mb-1">${product.category}</p>
          <h3 class="font-bold text-sm sm:text-base leading-snug line-clamp-2 mb-2">${product.title}</h3>
          <div class="mt-auto">
            <div class="flex items-end gap-2 mb-3">
              <span class="text-lg sm:text-xl font-black text-rgsu-500">${formatPrice(product.price)}</span>
              ${product.oldPrice ? `<span class="text-xs sm:text-sm text-onSurface-tertiary line-through">${formatPrice(product.oldPrice)}</span>` : ''}
            </div>
            <div class="product-action">
              ${qtyInCart > 0 ? `
                <div class="flex items-center justify-between bg-surface-2 rounded-2xl px-2 py-1" onclick="event.stopPropagation()">
                  <button onclick="event.stopPropagation(); changeCartQty(${product.id}, -1)" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-3 text-onSurface-secondary"><i data-lucide="minus" class="w-4 h-4"></i></button>
                  <span class="text-sm font-bold text-onSurface-primary mx-2">${qtyInCart}</span>
                  <button onclick="event.stopPropagation(); changeCartQty(${product.id}, 1)" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-3 text-onSurface-secondary"><i data-lucide="plus" class="w-4 h-4"></i></button>
                </div>
              ` : `
                <button onclick="event.stopPropagation(); addToCart(${product.id})" class="m3-btn w-full py-2.5 bg-rgsu-500 hover:bg-rgsu-600 text-white rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-rgsu-500/20">
                  <i data-lucide="plus" class="w-4 h-4"></i> В корзину
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function filterCategory(category, btn) { currentCategory = category; document.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); btn.classList.add('active'); renderProducts(); }
function toggleSort() { document.getElementById('sortDropdown').classList.toggle('hidden'); }
function sortProducts(type) { currentSort = type; document.getElementById('sortLabel').textContent = { popular: 'По популярности', priceAsc: 'Сначала дешевле', priceDesc: 'Сначала дороже', new: 'Новинки' }[type]; document.getElementById('sortDropdown').classList.add('hidden'); renderProducts(); }
function toggleSearch() { document.getElementById('mobileSearch').classList.toggle('hidden'); }
function toggleFilters() { document.getElementById('filtersPanel').classList.toggle('open'); }
function applyFilters() { priceMin = parseInt(document.getElementById('priceMin').value) || null; priceMax = parseInt(document.getElementById('priceMax').value) || null; sizeFilter = document.getElementById('sizeFilter').value; renderProducts(); }
function resetFilters() { document.getElementById('priceMin').value = ''; document.getElementById('priceMax').value = ''; document.getElementById('sizeFilter').value = ''; priceMin = priceMax = null; sizeFilter = ''; renderProducts(); }

// ============================================
// CART (API)
// ============================================
async function addToCart(productId) {
  if (!authToken) { showToast('Войдите в аккаунт', 'alert-circle'); return; }
  const product = products.find(p => p.id === productId);
  try {
    await api('/api/cart', 'POST', { product_id: productId, qty: 1, size: product.sizes ? product.sizes[0] : 'One Size' });
    await fetchCart();
    updateProductCard(productId);
    showToast(`${product.title} добавлен в корзину`);
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function changeCartQty(productId, delta) {
  const item = cart.find(c => c.product_id === productId);
  if (!item) return;
  const newQty = item.qty + delta;
  try {
    if (newQty <= 0) {
      await api(`/api/cart/${productId}?size=${item.size}`, 'DELETE');
    } else {
      await api(`/api/cart/${productId}`, 'PUT', { qty: newQty, size: item.size });
    }
    await fetchCart();
    updateProductCard(productId);
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

function updateProductCard(productId) {
  const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
  if (!card) return;
  const cartItem = cart.find(c => c.product_id === productId);
  const qtyInCart = cartItem ? cartItem.qty : 0;
  const actionContainer = card.querySelector('.product-action');
  if (!actionContainer) return;
  actionContainer.innerHTML = qtyInCart > 0 ? `
    <div class="flex items-center justify-between bg-surface-2 rounded-2xl px-2 py-1" onclick="event.stopPropagation()">
      <button onclick="event.stopPropagation(); changeCartQty(${productId}, -1)" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-3 text-onSurface-secondary"><i data-lucide="minus" class="w-4 h-4"></i></button>
      <span class="text-sm font-bold text-onSurface-primary mx-2">${qtyInCart}</span>
      <button onclick="event.stopPropagation(); changeCartQty(${productId}, 1)" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-3 text-onSurface-secondary"><i data-lucide="plus" class="w-4 h-4"></i></button>
    </div>
  ` : `
    <button onclick="event.stopPropagation(); addToCart(${productId})" class="m3-btn w-full py-2.5 bg-rgsu-500 hover:bg-rgsu-600 text-white rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-rgsu-500/20">
      <i data-lucide="plus" class="w-4 h-4"></i> В корзину
    </button>
  `;
  lucide.createIcons();
}

function updateCartUI() {
  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const totalQty = cart.reduce((sum, c) => sum + c.qty, 0);
  const badge = document.getElementById('cartBadge');
  const totalEl = document.getElementById('cartTotal');

  if (badge) {
    if (totalQty > 0) {
      badge.classList.remove('hidden');
      badge.classList.add('flex');
      badge.textContent = totalQty;
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('flex');
    }
  }

  if (totalEl) {
    if (totalQty > 0) {
      totalEl.textContent = formatPrice(total);
    } else {
      totalEl.textContent = '0 ₽';
    }
  }
}

async function checkout() {
  if (!authToken) { showToast('Войдите в аккаунт', 'alert-circle'); return; }
  try {
    await api('/api/orders', 'POST');
    await fetchCart();
    await fetchOrders();
    renderCartItems();
    showToast('Заказ оформлен! 🎉');
    setTimeout(() => closeCart(), 1500);
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

function openCart() {
  document.getElementById('cartOverlay').classList.remove('hidden');
  document.getElementById('cartSidebar').classList.remove('translate-x-full');
  document.body.style.overflow = 'hidden';
  renderCartItems();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.add('hidden');
  document.getElementById('cartSidebar').classList.add('translate-x-full');
  document.body.style.overflow = '';
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  if (cart.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden'); empty.classList.add('flex');
    footer.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden'); empty.classList.remove('flex');
  footer.classList.remove('hidden');
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  document.getElementById('subtotalPrice').textContent = formatPrice(subtotal);
  document.getElementById('totalPrice').textContent = formatPrice(subtotal);
  document.getElementById('cartItemCount').textContent = `${cart.length} товар${getPlural(cart.length)}`;
  container.innerHTML = cart.map(item => `
    <div class="flex gap-3 p-3 bg-surface-1 rounded-2xl mb-3 slide-up">
      <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"><img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover"></div>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm leading-snug line-clamp-1">${item.title}</h4>
        <p class="text-xs text-onSurface-tertiary mt-0.5">Размер: ${item.size}</p>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-2">
            <button onclick="changeCartQty(${item.product_id}, -1)" class="m3-btn w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3"><i data-lucide="minus" class="w-3.5 h-3.5"></i></button>
            <span class="text-sm font-bold w-5 text-center">${item.qty}</span>
            <button onclick="changeCartQty(${item.product_id}, 1)" class="m3-btn w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>
          </div>
          <div class="text-right"><p class="font-bold text-sm text-rgsu-500">${formatPrice(item.price * item.qty)}</p></div>
        </div>
      </div>
      <button onclick="removeFromCart(${item.product_id})" class="m3-btn self-start w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2 text-onSurface-tertiary"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
}

async function removeFromCart(productId) {
  try {
    await api(`/api/cart/${productId}?qty=0`, 'DELETE');
    await fetchCart();
    renderCartItems();
  } catch(e) {}
}

// ============================================
// FAVORITES
// ============================================
async function toggleFavorite(productId) {
  if (!authToken) { showToast('Войдите в аккаунт', 'alert-circle'); return; }
  try {
    const result = await api(`/api/favorites/${productId}`, 'POST');
    if (result.isFavorite) favorites.push(productId);
    else favorites = favorites.filter(id => id !== productId);
    updateFavBadge();
    renderProducts();
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

function toggleFavorites() {
  if (currentCategory === 'favorites') {
    // Если уже в избранном, возвращаемся к "Все товары"
    currentCategory = 'all';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('[data-category="all"]');
    if (allChip) allChip.classList.add('active');
    renderCategoryChips(); // перестраиваем чипсы с правильной подсветкой
    renderProducts();
    return;
  }

  // Переключаемся на избранное
  currentCategory = 'favorites';
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  
  // Получаем только избранные товары (они уже в массиве favorites)
  const favProducts = products.filter(p => favorites.includes(p.id));
  
  if (favProducts.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    document.getElementById('productCount').textContent = 'В избранном пусто';
    return;
  }
  
  empty.classList.add('hidden');
  document.getElementById('productCount').textContent = `Избранное: ${favProducts.length} товар${getPlural(favProducts.length)}`;
  
  // Строим те же карточки, что и в обычном каталоге, но с учётом количества в корзине
  grid.innerHTML = favProducts.map((product, index) => {
    const cartItem = cart.find(c => c.product_id === product.id);
    const qtyInCart = cartItem ? cartItem.qty : 0;
    
    return `
      <div class="product-card bg-white rounded-3xl overflow-hidden m3-expressive-shadow cursor-pointer fade-in h-full flex flex-col" data-product-id="${product.id}"
           style="animation-delay: ${index * 50}ms" onclick="openProductModal(${product.id})">
        <div class="relative overflow-hidden aspect-[4/3]">
          <img src="${product.images && product.images.length ? product.images[0] : ''}" alt="${product.title}" class="w-full h-full object-cover">
          <button onclick="event.stopPropagation(); toggleFavorite(${product.id})" 
            class="absolute top-3 right-3 m3-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-md text-red-500">
            <i data-lucide="heart" class="w-4 h-4 fill-current"></i>
          </button>
        </div>
        <div class="p-3 sm:p-4 flex flex-col flex-1">
          <p class="text-xs text-onSurface-tertiary font-medium mb-1">${product.category}</p>
          <h3 class="font-bold text-sm sm:text-base leading-snug line-clamp-2 mb-2">${product.title}</h3>
          <div class="mt-auto">
            <div class="flex items-end gap-2 mb-3">
              <span class="text-lg sm:text-xl font-black text-rgsu-500">${formatPrice(product.price)}</span>
              ${product.oldPrice ? `<span class="text-xs sm:text-sm text-onSurface-tertiary line-through">${formatPrice(product.oldPrice)}</span>` : ''}
            </div>
            <div class="product-action">
              ${qtyInCart > 0 ? `
                <div class="flex items-center justify-between bg-surface-2 rounded-2xl px-2 py-1" onclick="event.stopPropagation()">
                  <button onclick="event.stopPropagation(); changeCartQty(${product.id}, -1)" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-3 text-onSurface-secondary"><i data-lucide="minus" class="w-4 h-4"></i></button>
                  <span class="text-sm font-bold text-onSurface-primary mx-2">${qtyInCart}</span>
                  <button onclick="event.stopPropagation(); changeCartQty(${product.id}, 1)" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-3 text-onSurface-secondary"><i data-lucide="plus" class="w-4 h-4"></i></button>
                </div>
              ` : `
                <button onclick="event.stopPropagation(); addToCart(${product.id})" class="m3-btn w-full py-2.5 bg-rgsu-500 hover:bg-rgsu-600 text-white rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-rgsu-500/20">
                  <i data-lucide="plus" class="w-4 h-4"></i> В корзину
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function toggleFavoriteModal() {
  if (modalProductId) {
    toggleFavorite(modalProductId); // вызов уже существующей функции переключения избранного
    // обновим иконку сердечка в модальном окне
    const favBtn = document.getElementById('modalFavBtn');
    if (favBtn) {
      favBtn.innerHTML = favorites.includes(modalProductId)
        ? '<i data-lucide="heart" class="w-5 h-5 text-onSurface-tertiary"></i>'
        : '<i data-lucide="heart" class="w-5 h-5 fill-current text-red-500"></i>';
      lucide.createIcons();
    }
  }
}

function updateFavBadge() {
  const badge = document.getElementById('favBadge');
  if (!badge) return;
  if (favorites.length > 0) {
    badge.classList.remove('hidden'); badge.classList.add('flex'); badge.textContent = favorites.length;
  } else {
    badge.classList.add('hidden'); badge.classList.remove('flex');
  }
}

// ============================================
// PRODUCT MODAL
// ============================================
async function openProductModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const favBtn = document.getElementById('modalFavBtn');
  if (favBtn) {
    favBtn.innerHTML = favorites.includes(productId) 
      ? '<i data-lucide="heart" class="w-5 h-5 fill-current text-red-500"></i>' 
      : '<i data-lucide="heart" class="w-5 h-5 text-onSurface-tertiary"></i>';
  }

  modalProductId = productId;
  modalQty = 1;
  modalSelectedSize = product.sizes ? product.sizes[0] : null;

  document.getElementById('modalTitle').textContent = product.title;
  document.getElementById('modalCategory').textContent = product.category;
  document.getElementById('modalDescription').textContent = product.description;

  // Галерея (уже было)
  const images = product.images && product.images.length ? product.images : ['http://static.photos/placeholder/640x360/0'];
  document.getElementById('modalImage').src = images[0];
  const thumbnailsContainer = document.getElementById('modalThumbnails');
  if (thumbnailsContainer && images.length > 1) {
    thumbnailsContainer.innerHTML = images.map((img, idx) => `
      <img src="${img}" 
           class="w-16 h-16 rounded-xl object-cover cursor-pointer border-2 ${idx === 0 ? 'border-rgsu-500' : 'border-transparent'} hover:border-rgsu-300 transition-colors"
           onclick="event.stopPropagation(); setMainImage('${img}', this)">
    `).join('');
  } else if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
  }

  document.getElementById('modalPrice').textContent = formatPrice(product.price);
  document.getElementById('modalOldPrice').textContent = product.oldPrice ? formatPrice(product.oldPrice) : '';
  document.getElementById('modalOldPrice').classList.toggle('hidden', !product.oldPrice);
  document.getElementById('modalQty').textContent = modalQty;
  document.getElementById('modalTags').innerHTML = product.tags.map(tag => `<span class="px-3 py-1 rounded-xl text-xs font-bold ${tag === 'Новинка' ? 'bg-rgsu-50 text-rgsu-500' : tag === 'Хит' ? 'bg-rgsu-red/10 text-rgsu-red' : tag.startsWith('-') ? 'bg-green-100 text-green-700' : 'bg-surface-2 text-onSurface-secondary'}">${tag}</span>`).join('');

  if (product.sizes) {
    document.getElementById('modalSizesSection').classList.remove('hidden');
    document.getElementById('modalSizes').innerHTML = product.sizes.map(size => `<button onclick="selectSize('${size}', this)" class="m3-btn px-3.5 py-2 rounded-xl text-sm font-medium border-2 ${size === modalSelectedSize ? 'border-rgsu-500 bg-rgsu-50 text-rgsu-500' : 'border-surface-3 bg-white text-onSurface-secondary'}">${size}</button>`).join('');
  } else {
    document.getElementById('modalSizesSection').classList.add('hidden');
  }

  // Загружаем отзывы
  document.getElementById('productModalOverlay').classList.remove('hidden');
  document.getElementById('productModal').classList.add('flex');
  document.getElementById('productModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Скрываем форму, если пользователь уже оставил отзыв
  const userId = currentUser?.id;
  const alreadyReviewed = product.reviews?.some(r => r.user_id === userId);
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    // Удаляем предыдущее сообщение «Вы уже оставили отзыв» (если есть)
    const prevMsg = reviewForm.parentNode.querySelector('.already-reviewed-msg');
    if (prevMsg) prevMsg.remove();

    if (alreadyReviewed) {
      reviewForm.classList.add('hidden');
      const msg = document.createElement('p');
      msg.className = 'text-sm text-onSurface-tertiary mt-2 already-reviewed-msg';
      msg.textContent = 'Вы уже оставили отзыв на этот товар.';
      reviewForm.parentNode.appendChild(msg);
    } else {
      reviewForm.classList.remove('hidden');
    }
  }
  await loadReviews(productId);
  lucide.createIcons();
}

async function loadReviews(productId) {
  try {
    const reviews = await api('/api/reviews/' + productId);
    const container = document.getElementById('modalReviews');
    if (!container) return;

    if (!reviews.length) {
      container.innerHTML = '<p class="text-sm text-onSurface-tertiary">Отзывов пока нет.</p>';
    } else {
      container.innerHTML = reviews.map(r => `
        <div class="bg-surface-1 p-3 rounded-xl">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-semibold">${r.author}</span>
            <span class="text-yellow-500 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
            <span class="text-xs text-onSurface-tertiary ml-auto">${r.date}</span>
          </div>
          <p class="text-sm text-onSurface-secondary">${r.text}</p>
        </div>
      `).join('');
    }

    // Проверка, оставил ли текущий пользователь отзыв
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
      const userId = currentUser?.id;
      const alreadyReviewed = reviews.some(r => r.user_id === userId);
      const prevMsg = reviewForm.parentNode.querySelector('.already-reviewed-msg');
      if (prevMsg) prevMsg.remove();

      if (alreadyReviewed) {
        reviewForm.classList.add('hidden');
        const msg = document.createElement('p');
        msg.className = 'text-sm text-onSurface-tertiary mt-2 already-reviewed-msg';
        msg.textContent = 'Вы уже оставили отзыв на этот товар.';
        reviewForm.parentNode.appendChild(msg);
      } else {
        reviewForm.classList.remove('hidden');
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки отзывов:', e);
  }
}

let currentReviewRating = 5;
function setReviewRating(rating) {
  currentReviewRating = rating;
  const buttons = document.querySelectorAll('#reviewRating button');
  buttons.forEach((btn, idx) => {
    btn.textContent = (5 - idx) >= rating ? '★' : '☆';
    btn.classList.toggle('text-yellow-500', (5 - idx) >= rating);
  });
}

async function submitReview() {
  if (!authToken || !modalProductId) {
    showToast('Войдите, чтобы оставить отзыв', 'alert-circle');
    return;
  }
  const text = document.getElementById('reviewText')?.value.trim();
  const rating = parseInt(document.getElementById('reviewRating')?.value);
  if (!text || isNaN(rating) || rating < 1 || rating > 5) {
    showToast('Введите текст и выберите оценку', 'alert-circle');
    return;
  }
  try {
    await api('/api/reviews/' + modalProductId, 'POST', { rating, text });
    document.getElementById('reviewText').value = '';
    loadReviews(modalProductId); // обновить список отзывов
    showToast('Отзыв отправлен!');
  } catch (e) {
    showToast(e.message, 'alert-circle');
  }
}

function setMainImage(src, thumb) {
  document.getElementById('modalImage').src = src;
  document.querySelectorAll('#modalThumbnails img').forEach(img => {
    img.classList.remove('border-rgsu-500');
    img.classList.add('border-transparent');
  });
  thumb.classList.add('border-rgsu-500');
  thumb.classList.remove('border-transparent');
}

function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.remove('hidden');
  lb.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.classList.add('hidden');
    lb.classList.remove('flex');
  }
  document.body.style.overflow = '';
}

function closeProductModal() {
  document.getElementById('productModalOverlay').classList.add('hidden');
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('productModal').classList.remove('flex');
  document.body.style.overflow = '';
}

function selectSize(size, btn) {
  modalSelectedSize = size;
  document.querySelectorAll('#modalSizes button').forEach(b => {
    b.classList.remove('border-rgsu-500', 'bg-rgsu-50', 'text-rgsu-500');
    b.classList.add('border-surface-3', 'bg-white', 'text-onSurface-secondary');
  });
  btn.classList.add('border-rgsu-500', 'bg-rgsu-50', 'text-rgsu-500');
  btn.classList.remove('border-surface-3', 'bg-white', 'text-onSurface-secondary');
}

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  document.getElementById('modalQty').textContent = modalQty;
}

async function addToCartFromModal() {
  if (!authToken) { showToast('Войдите в аккаунт', 'alert-circle'); return; }
  const product = products.find(p => p.id === modalProductId);
  try {
    await api('/api/cart', 'POST', { product_id: modalProductId, qty: modalQty, size: modalSelectedSize || 'One Size' });
    await fetchCart();
    showToast(`${product.title} добавлен в корзину`);
    closeProductModal();
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

// ============================================
// AUTH
// ============================================
function openAuthModal() {
  if (currentUser) {
    document.getElementById('userDropdown').classList.toggle('hidden');
    return;
  }
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('authModal').classList.add('flex');
  document.getElementById('authModal').classList.remove('hidden');
  switchAuthTab('login');
}

function closeAuthModal() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('authModal').classList.remove('flex');
}

async function login() {
  const email = document.getElementById('authEmail').value;
  const pass = document.getElementById('authPass').value;
  try {
    const data = await api('/api/login', 'POST', { email, password: pass });
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken);
    currentUser = data.user;
    updateLoginButton();
    closeAuthModal();
    await fetchCart();
    await fetchFavorites();
    renderProducts();
    showToast('Добро пожаловать, ' + currentUser.name + '!');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  if (!name || !email || !pass || pass.length < 6) {
    showToast('Заполните все поля (пароль минимум 6 символов)', 'alert-circle');
    return;
  }
  try {
    const data = await api('/api/register', 'POST', { name, email, password: pass });
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken);
    currentUser = data.user;
    updateLoginButton();
    closeAuthModal();
    await fetchCart();
    await fetchFavorites();
    renderProducts();
    showToast('Регистрация успешна! Добро пожаловать, ' + currentUser.name + '!');
  } catch(e) {
    showToast(e.message || 'Ошибка регистрации', 'alert-circle');
  }
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('tabLogin');
  const registerTab = document.getElementById('tabRegister');
  const loginForm = document.getElementById('authFormLogin');
  const registerForm = document.getElementById('authFormRegister');
  if (!loginTab || !registerTab || !loginForm || !registerForm) return;

  if (tab === 'login') {
    loginTab.classList.add('active', 'bg-rgsu-50', 'text-rgsu-500');
    registerTab.classList.remove('active', 'bg-rgsu-50', 'text-rgsu-500');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTab.classList.add('active', 'bg-rgsu-50', 'text-rgsu-500');
    loginTab.classList.remove('active', 'bg-rgsu-50', 'text-rgsu-500');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

function logout() {
  localStorage.removeItem('auth_token');
  authToken = null;
  currentUser = null;
  cart = [];
  favorites = [];
  updateLoginButton();
  window.location.reload();
}

function toggleUserAction() {
  if (currentUser) {
    document.getElementById('userDropdown').classList.toggle('hidden');
  } else {
    openAuthModal();
  }
}

// ============================================
// CABINET
// ============================================
function initCabinet() {
  if (!currentUser) { window.location.href = 'index.html'; return; }
  document.getElementById('cabinetUserName').textContent = currentUser.name || 'Студент';
  document.getElementById('cabinetUserEmail').textContent = currentUser.email || '';
  document.getElementById('profileSurname').value = currentUser.surname || '';
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profilePatronymic').value = currentUser.patronymic || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profilePhone').value = currentUser.phone || '';
  document.getElementById('profileBirthdate').value = currentUser.birthdate || '';
  if (currentUser.avatar) {
    document.getElementById('avatarPreview').src = currentUser.avatar;
    document.getElementById('avatarPreview').classList.remove('hidden');
    document.getElementById('avatarDefault').classList.add('hidden');
  }
  document.querySelectorAll('.cabinet-tab').forEach(tab => {
    tab.addEventListener('click', () => switchCabinetTab(tab.dataset.tab));
  });
  switchCabinetTab('profile');
  lucide.createIcons();
}

function updateLoginButton() {
  const btn = document.getElementById('loginBtn');
  if (btn) {
    btn.innerHTML = currentUser ? '<i data-lucide="user-check" class="w-5 h-5 text-rgsu-500"></i>' : '<i data-lucide="user" class="w-5 h-5"></i>';
  }
  const userNameDisplay = document.getElementById('userNameDisplay');
  if (userNameDisplay) {
    userNameDisplay.textContent = currentUser ? currentUser.name : 'Студент';
  }
  lucide.createIcons();
}

function switchCabinetTab(tabName) {
  document.querySelectorAll('.cabinet-tab').forEach(t => t.classList.remove('active'));
  const targetTab = document.querySelector(`.cabinet-tab[data-tab="${tabName}"]`);
  if (targetTab) targetTab.classList.add('active');
  document.querySelectorAll('.cabinet-tab-content').forEach(c => c.classList.add('hidden'));
  const content = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (content) content.classList.remove('hidden');
  if (tabName === 'orders') renderCabinetOrders();
  else if (tabName === 'favorites') {
  if (products.length > 0) {
    renderCabinetFavorites();
  } else {
    // показываем индикатор загрузки, пока товары не придут
    document.getElementById('cabinetFavoritesGrid').innerHTML = 
      '<p class="text-sm text-onSurface-tertiary col-span-full text-center">Загрузка...</p>';
    fetchProducts().then(() => renderCabinetFavorites());
  }
}
  else if (tabName === 'addresses') renderAddresses();
  else if (tabName === 'payment') renderPaymentMethods();
}

function renderCabinetOrders() {
  const list = document.getElementById('ordersList');
  const empty = document.getElementById('ordersEmpty');
  if (!orders.length) {
    list.innerHTML = ''; empty.classList.remove('hidden'); return;
  }
  empty.classList.add('hidden');
  const statusColors = { 'В обработке': 'bg-yellow-400', 'Отправлен': 'bg-blue-400', 'Доставлен': 'bg-green-400', 'Отменён': 'bg-red-400' };
  list.innerHTML = orders.map(order => {
    const dotColor = statusColors[order.status] || 'bg-gray-400';
    return `<div class="bg-white rounded-2xl p-4 mb-3 m3-expressive-shadow dark:bg-gray-800">
      <div class="flex justify-between items-start mb-2">
        <div><p class="font-bold text-sm">Заказ №${order.id}</p><p class="text-xs text-onSurface-tertiary">${order.date}</p></div>
        <span class="px-3 py-1 rounded-full text-xs font-medium bg-rgsu-50 text-rgsu-500 flex items-center gap-1"><span class="w-2 h-2 rounded-full ${dotColor}"></span>${order.status}</span>
      </div>
      <div class="order-items hidden mt-2 space-y-1">
        ${order.items.map(item => `<div class="flex justify-between text-sm">
          <span class="cursor-pointer hover:text-rgsu-500 hover:underline" onclick="openOrderProduct(${item.product_id})">${item.title} ×${item.qty} (${item.size})</span>
          <span class="font-medium">${formatPrice(item.price * item.qty)}</span>
        </div>`).join('')}
        <div class="border-t border-surface-2 mt-2 pt-2 flex justify-between font-bold text-sm"><span>Итого</span><span class="text-rgsu-500">${formatPrice(order.total)}</span></div>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="toggleOrderDetails(this)" class="m3-btn px-3 py-1.5 bg-surface-2 text-onSurface-secondary rounded-xl text-xs font-medium">
          <i data-lucide="chevron-down" class="w-4 h-4 mr-1 inline chevron-down" style="display:inline"></i>
          <i data-lucide="chevron-up" class="w-4 h-4 mr-1 inline chevron-up" style="display:none"></i>
          Детали
        </button>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function toggleOrderDetails(btn) {
  const container = btn.closest('.bg-white').querySelector('.order-items');
  if (!container) return;

  const isHidden = container.classList.toggle('hidden');
  const chevronDown = btn.querySelector('.chevron-down');
  const chevronUp = btn.querySelector('.chevron-up');

  if (chevronDown) chevronDown.style.display = isHidden ? 'inline' : 'none';
  if (chevronUp) chevronUp.style.display = isHidden ? 'none' : 'inline';
}

function openOrderProduct(productId) {
  if (typeof openProductModal === 'function') {
    openProductModal(productId);
  } else {
    console.error('Функция openProductModal не найдена');
  }
}

function renderCabinetFavorites() {
  const grid = document.getElementById('cabinetFavoritesGrid');
  const empty = document.getElementById('favoritesEmpty');
  if (!favorites.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const favProducts = products.filter(p => favorites.includes(p.id));
  grid.innerHTML = favProducts.map(product => `
    <div class="product-card bg-white rounded-3xl overflow-hidden m3-expressive-shadow cursor-pointer" onclick="openProductModal(${product.id})">
      <div class="relative overflow-hidden aspect-[4/3]">
        <img src="${product.images && product.images.length ? product.images[0] : ''}" class="w-full h-full object-cover">
        <button onclick="event.stopPropagation(); toggleFavorite(${product.id})" class="absolute top-3 right-3 m3-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-md text-red-500"><i data-lucide="heart" class="w-4 h-4 fill-current"></i></button>
      </div>
      <div class="p-3"><p class="text-xs text-onSurface-tertiary">${product.category}</p><h3 class="font-bold text-sm">${product.title}</h3><p class="text-rgsu-500 font-bold mt-1">${formatPrice(product.price)}</p></div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderAddresses() {
  const list = document.getElementById('addressesList');
  if (!list) return;
  if (!addresses.length) { list.innerHTML = '<p class="text-sm text-onSurface-tertiary">Нет адресов</p>'; return; }
  list.innerHTML = addresses.map((addr, idx) => `
    <div class="bg-white rounded-2xl p-4 m3-expressive-shadow flex justify-between items-start dark:bg-gray-800">
      <div>
        <p class="font-bold text-sm">${addr.label || 'Адрес ' + (idx+1)}</p>
        <p class="text-sm text-onSurface-secondary mt-1">${addr.address}</p>
        <p class="text-xs mt-1">${addr.isDefault ? '✅ Основной' : `<button onclick="setDefaultAddress(${idx})" class="text-rgsu-500 underline">Сделать основным</button>`}</p>
      </div>
      <div class="flex gap-2">
        <button onclick="openAddressModal(${idx})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button onclick="deleteAddress(${idx})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderPaymentMethods() {
  const list = document.getElementById('paymentMethodsList');
  if (!list) return;
  if (!paymentMethods.length) { list.innerHTML = '<p class="text-sm text-onSurface-tertiary col-span-full">Нет карт</p>'; return; }
  list.innerHTML = paymentMethods.map((pm, idx) => `
    <div class="bg-white rounded-2xl p-4 m3-expressive-shadow flex justify-between items-center dark:bg-gray-800">
      <div><p class="font-bold text-sm">•••• ${pm.last4}</p><p class="text-xs text-onSurface-tertiary">${pm.brand} · ${pm.expiry}</p></div>
      <button onclick="deletePaymentMethod(${idx})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
}

async function saveProfile() {
  if (!currentUser) return;
  const data = {
    surname: document.getElementById('profileSurname').value,
    name: document.getElementById('profileName').value,
    patronymic: document.getElementById('profilePatronymic').value,
    email: document.getElementById('profileEmail').value,
    phone: document.getElementById('profilePhone').value,
    birthdate: document.getElementById('profileBirthdate').value,
  };
  try {
    await api('/api/profile', 'PUT', data);
    currentUser = { ...currentUser, ...data };
    document.getElementById('cabinetUserName').textContent = currentUser.name;
    showToast('Профиль обновлён');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function saveAddressFromModal() {
  const label = document.getElementById('addressLabel').value.trim();
  const address = document.getElementById('addressInput').value.trim();
  if (!address) { showToast('Введите адрес', 'alert-circle'); return; }
  try {
    if (editingAddressIndex >= 0) {
      await api(`/api/addresses/${addresses[editingAddressIndex].id}`, 'PUT', { label, address });
    } else {
      await api('/api/addresses', 'POST', { label, address });
    }
    await fetchAddresses();
    renderAddresses();
    closeAddressModal();
    showToast(editingAddressIndex >= 0 ? 'Адрес обновлён' : 'Адрес добавлен');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function saveCard() {
  const number = document.getElementById('cardNumber').value.replace(/\s/g, '');
  const expiry = document.getElementById('cardExpiry').value;
  const brand = document.getElementById('cardBrand').textContent;
  const last4 = number.slice(-4);
  if (!number || !expiry || !last4) { showToast('Заполните поля', 'alert-circle'); return; }
  try {
    await api('/api/payment-methods', 'POST', { last4, brand, expiry });
    await fetchPaymentMethods();
    renderPaymentMethods();
    closeCardModal();
    showToast('Карта добавлена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function deleteAddress(index) {
  if (!confirm('Удалить адрес?')) return;
  try {
    await api(`/api/addresses/${addresses[index].id}`, 'DELETE');
    addresses.splice(index, 1);
    renderAddresses();
    showToast('Адрес удалён');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function setDefaultAddress(index) {
  try {
    await api(`/api/addresses/${addresses[index].id}/default`, 'PUT');
    await fetchAddresses();
    renderAddresses();
    showToast('Основной адрес изменён');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function deletePaymentMethod(index) {
  if (!confirm('Удалить карту?')) return;
  try {
    await api(`/api/payment-methods/${paymentMethods[index].id}`, 'DELETE');
    paymentMethods.splice(index, 1);
    renderPaymentMethods();
    showToast('Карта удалена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

// ============================================
// ADDRESS / CARD MODALS
// ============================================
let editingAddressIndex = -1;

function openAddressModal(index = -1) {
  const modal = document.getElementById('addressModal');
  const overlay = document.getElementById('addressModalOverlay');
  if (!modal || !overlay) return;

  if (index >= 0) {
    document.getElementById('addressModalTitle').textContent = 'Редактировать адрес';
    const addr = addresses[index];
    document.getElementById('addressLabel').value = addr.label || '';
    document.getElementById('addressInput').value = addr.address || '';
    editingAddressIndex = index;
  } else {
    document.getElementById('addressModalTitle').textContent = 'Новый адрес';
    document.getElementById('addressLabel').value = '';
    document.getElementById('addressInput').value = '';
    editingAddressIndex = -1;
  }

  overlay.classList.remove('hidden');
  modal.classList.add('flex');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAddressModal() {
  document.getElementById('addressModalOverlay').classList.add('hidden');
  document.getElementById('addressModal').classList.add('hidden');
  document.getElementById('addressModal').classList.remove('flex');
  document.body.style.overflow = '';
}

function openCardModal() {
  document.getElementById('cardNumber').value = '';
  document.getElementById('cardExpiry').value = '';
  document.getElementById('cardCvv').value = '';
  document.getElementById('cardHolder').value = '';
  updateCardDisplay();
  document.getElementById('cardContainer').classList.remove('flipped');
  document.getElementById('cardModalOverlay').classList.remove('hidden');
  document.getElementById('cardModal').classList.add('flex');
  document.getElementById('cardModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCardModal() {
  document.getElementById('cardModalOverlay').classList.add('hidden');
  document.getElementById('cardModal').classList.add('hidden');
  document.getElementById('cardModal').classList.remove('flex');
  document.body.style.overflow = '';
}

function flipCard(showBack) {
  const container = document.getElementById('cardContainer');
  if (showBack) {
    container.classList.add('flipped');
  } else {
    container.classList.remove('flipped');
  }
}

function updateCardDisplay() {
  const numberInput = document.getElementById('cardNumber');
  let rawNumber = numberInput.value.replace(/\D/g, '').slice(0, 16);
  numberInput.value = rawNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  document.getElementById('cardNumberDisplay').textContent = numberInput.value || '•••• •••• •••• ••••';

  const expiryInput = document.getElementById('cardExpiry');
  let rawExpiry = expiryInput.value.replace(/\D/g, '').slice(0, 4);
  if (rawExpiry.length > 2) rawExpiry = rawExpiry.slice(0, 2) + ' / ' + rawExpiry.slice(2);
  expiryInput.value = rawExpiry;
  document.getElementById('cardExpiryDisplay').textContent = rawExpiry || 'ММ/ГГ';

  document.getElementById('cardCvv').value = document.getElementById('cardCvv').value.replace(/\D/g, '').slice(0, 3);
  document.getElementById('cardCvvDisplay').textContent = '•••';

  document.getElementById('cardHolderDisplay').textContent =
    document.getElementById('cardHolder').value || 'ИМЯ ДЕРЖАТЕЛЯ';

  let brand = '';
  if (/^4/.test(rawNumber)) brand = 'VISA';
  else if (/^5[1-5]/.test(rawNumber)) brand = 'MASTERCARD';
  else if (/^220[0-4]/.test(rawNumber)) brand = 'МИР';
  document.getElementById('cardBrand').textContent = brand || '•••';
}

// ============================================
// THEME & HELPERS
// ============================================
function getTheme() { return localStorage.getItem('rgsu_theme') || 'light'; }
function applyTheme(theme) { if (theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }
function toggleTheme() { const current = getTheme(); const next = current === 'dark' ? 'light' : 'dark'; localStorage.setItem('rgsu_theme', next); applyTheme(next); lucide.createIcons(); }
(function () { applyTheme(getTheme()); })();

function formatPrice(price) { return price.toLocaleString('ru-RU') + ' ₽'; }
function getPlural(n) { const abs = Math.abs(n) % 100; const last = abs % 10; if (abs > 10 && abs < 20) return 'ов'; if (last > 1 && last < 5) return 'а'; if (last === 1) return ''; return 'ов'; }

function openInfoModal(topic) {
  const titles = { delivery: 'Доставка', return: 'Возврат', size: 'Размерная сетка', faq: 'Часто задаваемые вопросы' };
  const contents = {
    delivery: '<p>Доставка курьером по Москве в пределах зоны доставки — от 1 до 3 дней. Самовывоз из магазина РГСУ (ул. Вильгельма Пика, д. 4) — бесплатно.</p>' +
      '<div class="map-container rounded-2xl overflow-hidden mt-4" style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;"><iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A579948515cf21d77b035bcac2f8d5379300dadac76657b5a996182981a6dc636&amp;source=constructor" width="809" height="653" frameborder="0"></iframe></div>',
    return: '<p>Вы можете вернуть товар в течение 14 дней с момента получения при сохранении товарного вида и упаковки. Возврат денег в течении 10 рабочих дней.</p>',
    faq: '<p><b>Как оплатить?</b> Банковской картой или наличными курьеру.<br><b>Где отследить заказ?</b> По номеру заказа в личном кабинете.</p>'
  };
  document.getElementById('infoModalTitle').textContent = titles[topic] || 'Информация';
  document.getElementById('infoModalContent').innerHTML = contents[topic] || '<p>Подробности уточняйте.</p>';
  document.getElementById('infoOverlay').classList.remove('hidden');
  document.getElementById('infoModal').classList.add('flex');
  document.getElementById('infoModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

function closeInfoModal() {
  document.getElementById('infoOverlay').classList.add('hidden');
  document.getElementById('infoModal').classList.add('hidden');
  document.getElementById('infoModal').classList.remove('flex');
  document.body.style.overflow = '';
}

function navigateToCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  const targetChip = document.querySelector(`.chip[data-category="${category}"]`);
  if (targetChip) targetChip.classList.add('active');
  renderProducts();
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
}

async function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  if (!container) return;

  let categories = [];
  try {
    categories = await api('/api/categories');
  } catch (e) {
    categories = [];
  }

  // Первая кнопка всегда «Все товары»
  let html = `<button class="chip active whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-medium border border-surface-4 bg-white" data-category="all" onclick="filterCategory('all', this)">Все товары</button>`;

  categories.forEach(cat => {
    html += `<button class="chip whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-medium border border-surface-4 bg-white text-onSurface-secondary" data-category="${cat.name}" onclick="filterCategory('${cat.name}', this)">${cat.name}</button>`;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

let reviewRatingValue = 0;

function setReviewStar(rating) {
  reviewRatingValue = rating;
  document.getElementById('reviewRating').value = rating;
  document.querySelectorAll('#starRating .star').forEach((star, index) => {
    star.classList.toggle('text-yellow-400', index < rating);
    star.classList.toggle('text-gray-300', index >= rating);
  });
}

async function submitReview() {
  if (!authToken || !modalProductId) {
    showToast('Войдите, чтобы оставить отзыв', 'alert-circle');
    return;
  }
  const text = document.getElementById('reviewText').value.trim();
  const rating = parseInt(document.getElementById('reviewRating').value);
  if (!text || isNaN(rating) || rating < 1 || rating > 5) {
    showToast('Введите текст и выберите оценку', 'alert-circle');
    return;
  }
  try {
    await api('/api/reviews/' + modalProductId, 'POST', { rating, text });
    document.getElementById('reviewText').value = '';
    // Сброс звёзд
    reviewRatingValue = 0;
    document.getElementById('reviewRating').value = 0;
    document.querySelectorAll('#starRating .star').forEach(s => {
      s.classList.add('text-gray-300');
      s.classList.remove('text-yellow-400');
    });
    await loadReviews(modalProductId);
    showToast('Отзыв отправлен!');
  } catch (e) {
    showToast(e.message, 'alert-circle');
  }
}

function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    // Показываем превью сразу
    const preview = document.getElementById('avatarPreview');
    const defaultIcon = document.getElementById('avatarDefault');
    if (preview) {
      preview.src = base64;
      preview.classList.remove('hidden');
    }
    if (defaultIcon) defaultIcon.classList.add('hidden');

    try {
      // Сохраняем аватар на сервере
      await api('/api/profile', 'PUT', { avatar: base64 });
      // Обновляем текущего пользователя локально
      if (currentUser) currentUser.avatar = base64;
      showToast('Аватар обновлён!');
    } catch (e) {
      showToast('Ошибка сохранения аватара', 'alert-circle');
    }
  };
  reader.readAsDataURL(file);
}