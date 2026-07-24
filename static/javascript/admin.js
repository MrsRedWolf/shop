// ============================================
// ADMIN FUNCTIONS (автономный блок)
// ============================================
let adminProducts = [];
let categories = [];
let newsList = [];

// Fetch data
async function fetchCategories() {
  try { categories = await api('/api/categories'); } catch (e) { categories = []; }
}
async function fetchAdminProducts() {
  try { adminProducts = await api('/api/products'); } catch (e) { adminProducts = []; }
}
async function fetchAdminNews() {
  try { newsList = await api('/api/news'); } catch (e) { newsList = []; }
}
async function fetchAdminOrders() {
  try { orders = await api('/api/orders'); } catch (e) { orders = []; }
}

// Render functions
function renderAdminOrders() {
  const list = document.getElementById('adminOrdersList');
  const empty = document.getElementById('adminOrdersEmpty');
  if (!orders || !orders.length) {
    if (list) list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  const statusColors = { 'В обработке': 'bg-yellow-400', 'Отправлен': 'bg-blue-400', 'Доставлен': 'bg-green-400', 'Отменён': 'bg-red-400' };
  list.innerHTML = orders.map(order => {
    const dotColor = statusColors[order.status] || 'bg-gray-400';
    const nextStatuses = getNextStatuses(order.status);
    return `
      <div class="bg-white rounded-2xl p-4 m3-expressive-shadow dark:bg-gray-800 dark:text-gray-200">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-bold text-sm">Заказ №${order.id}</p>
            <p class="text-xs text-onSurface-tertiary">${order.date}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-medium bg-rgsu-50 text-rgsu-500 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full ${dotColor}"></span>${order.status}
          </span>
        </div>
        <div class="mt-2 space-y-1">
          ${order.items.map(item => `
            <div class="flex justify-between text-sm">
              <span>${item.title} ×${item.qty} (${item.size})</span>
              <span class="font-medium">${item.price * item.qty} ₽</span>
            </div>
          `).join('')}
          <div class="border-t border-surface-2 mt-2 pt-2 flex justify-between font-bold text-sm">
            <span>Итого</span>
            <span class="text-rgsu-500">${order.total} ₽</span>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          ${nextStatuses.map(status => `
            <button onclick="changeOrderStatus(${order.id}, '${status}')" class="m3-btn px-3 py-1.5 bg-surface-2 text-onSurface-secondary rounded-xl text-xs font-medium hover:bg-rgsu-50 hover:text-rgsu-500 transition-colors">
              <i data-lucide="${statusIcon(status)}" class="w-4 h-4 mr-1 inline"></i> ${status}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function getNextStatuses(currentStatus) {
  const flow = {
    'В обработке': ['Отправлен', 'Отменён'],
    'Отправлен': ['Доставлен', 'Отменён'],
    'Доставлен': [],
    'Отменён': []
  };
  return flow[currentStatus] || [];
}
function statusIcon(status) {
  switch (status) {
    case 'Отправлен': return 'truck';
    case 'Доставлен': return 'package-check';
    case 'Отменён': return 'x-circle';
    default: return 'rotate-cw';
  }
}
async function changeOrderStatus(orderId, newStatus) {
  try {
    await api(`/api/orders/${orderId}/status?status=${encodeURIComponent(newStatus)}`, 'PUT');
    await fetchAdminOrders();
    renderAdminOrders();
    showToast(`Статус заказа изменён на «${newStatus}»`);
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

// Рендер товаров
function renderAdminProducts() {
  const list = document.getElementById('adminProductsList');
  const countEl = document.getElementById('adminProductCount');
  if (countEl) countEl.textContent = `${adminProducts.length} товаров`;
  if (!adminProducts.length) {
    list.innerHTML = '<p class="text-sm text-onSurface-tertiary">Нет товаров</p>';
    return;
  }
  list.innerHTML = adminProducts.map((product, index) => {
    const mainImage = (product.images && product.images.length) ? product.images[0] : 'http://static.photos/placeholder/640x360/0';
    return `
      <div class="bg-white rounded-2xl p-4 m3-expressive-shadow dark:bg-gray-800 dark:text-gray-200">
        <div class="flex gap-4 items-start">
          <img src="${mainImage}" alt="${product.title}" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start gap-2">
              <div>
                <p class="font-bold text-sm">${product.title}</p>
                <p class="text-xs text-onSurface-tertiary mt-0.5">${product.category}</p>
                <p class="text-xs text-onSurface-tertiary">${(product.images && product.images.length) || 0} фото</p>
              </div>
              <div class="flex gap-2">
                <button onclick="openProductForm(${index})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button onclick="deleteProduct(${index})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-2 text-sm">
              <span class="font-bold text-rgsu-500">${formatPrice(product.price)}</span>
              ${product.oldPrice ? `<span class="line-through text-onSurface-tertiary">${formatPrice(product.oldPrice)}</span>` : ''}
              <span class="text-onSurface-tertiary">| Размеры: ${product.sizes.join(', ')}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function openProductForm(index = -1) {
  const modal = document.getElementById('productFormModal');
  const titleEl = document.getElementById('productFormTitle');
  const form = document.getElementById('productForm');
  if (!modal || !form) return;
  const catSelect = document.getElementById('productCategorySelect');
  if (catSelect) catSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  if (index >= 0) {
    titleEl.textContent = 'Редактировать товар';
    const p = adminProducts[index];
    form['productId'].value = index;
    form['title'].value = p.title;
    form['category'].value = p.category;
    form['price'].value = p.price;
    form['oldPrice'].value = p.oldPrice || '';
    form['images'].value = (p.images || []).join(', ');
    form['description'].value = p.description;
    form['sizes'].value = (p.sizes || []).join(', ');
    form['tags'].value = (p.tags || []).join(', ');
  } else {
    titleEl.textContent = 'Новый товар';
    form.reset();
    form['productId'].value = -1;
    form['images'].value = '';
    form['sizes'].value = 'S, M, L';
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeProductForm() {
  const modal = document.getElementById('productFormModal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  document.body.style.overflow = '';
}

async function saveProductChanges() {
  const form = document.getElementById('productForm');
  const index = parseInt(form['productId'].value);
  const imagesStr = form['images'].value.trim();
  const images = imagesStr ? imagesStr.split(',').map(url => url.trim()).filter(u => u) : [];
  const data = {
    title: form['title'].value.trim(),
    category: form['category'].value,
    price: parseFloat(form['price'].value) || 0,
    oldPrice: form['oldPrice'].value ? parseFloat(form['oldPrice'].value) : null,
    description: form['description'].value.trim(),
    images: images,
    tags: form['tags'].value.split(',').map(t => t.trim()).filter(t => t),
    isNew: false,
    isPopular: false,
    sizes: form['sizes'].value.split(',').map(s => s.trim()).filter(s => s),
  };
  try {
    if (index >= 0) {
      await api(`/api/products/${adminProducts[index].id}`, 'PUT', data);
    } else {
      await api('/api/products', 'POST', data);
    }
    await fetchAdminProducts();
    renderAdminProducts();
    closeProductForm();
    showToast(index >= 0 ? 'Товар обновлён' : 'Товар добавлен');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function deleteProduct(index) {
  if (!confirm('Удалить товар?')) return;
  try {
    await api(`/api/products/${adminProducts[index].id}`, 'DELETE');
    adminProducts.splice(index, 1);
    renderAdminProducts();
    showToast('Товар удалён');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

// Категории
function renderCategories() {
  const list = document.getElementById('categoriesList');
  if (!list) return;
  if (!categories.length) {
    list.innerHTML = '<p class="text-sm text-onSurface-tertiary">Нет категорий</p>';
    return;
  }
  list.innerHTML = categories.map((cat, idx) => `
    <div class="flex items-center justify-between bg-white rounded-2xl p-3 m3-expressive-shadow dark:bg-gray-800">
      <span class="font-medium">${cat.name}</span>
      <button onclick="deleteCategory(${idx})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2 text-onSurface-tertiary"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
}

function openCategoryForm() {
  const name = prompt('Название категории:');
  if (!name) return;
  createCategory(name);
}

async function createCategory(name) {
  try {
    await api('/api/categories', 'POST', { name });
    await fetchCategories();
    renderCategories();
    showToast('Категория добавлена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function deleteCategory(index) {
  if (!confirm(`Удалить категорию "${categories[index].name}"?`)) return;
  try {
    await api(`/api/categories/${categories[index].id}`, 'DELETE');
    categories.splice(index, 1);
    renderCategories();
    showToast('Категория удалена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

// Новости
function renderNews() {
  const list = document.getElementById('newsList');
  if (!list) return;
  if (!newsList.length) {
    list.innerHTML = '<p class="text-sm text-onSurface-tertiary">Нет новостей</p>';
    return;
  }
  list.innerHTML = newsList.map((news, idx) => `
    <div class="bg-white rounded-2xl p-4 m3-expressive-shadow dark:bg-gray-800">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-sm">${news.title}</p>
          <p class="text-xs text-onSurface-tertiary">${news.subtitle || ''} ${news.date || ''}</p>
          <p class="text-sm mt-1 line-clamp-2">${news.description}</p>
          <div class="flex gap-2 mt-2">
            ${news.link1_url ? `<a href="${news.link1_url}" target="_blank" class="text-xs text-rgsu-500 underline">${news.link1_text || 'Кнопка 1'}</a>` : ''}
            ${news.link2_url ? `<a href="${news.link2_url}" target="_blank" class="text-xs text-rgsu-500 underline">${news.link2_text || 'Кнопка 2'}</a>` : ''}
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="editNews(${idx})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button onclick="deleteNews(${idx})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function openNewsForm(index = -1) {
  const modal = document.getElementById('newsFormModal');
  const titleEl = document.getElementById('newsFormTitle');
  const form = document.getElementById('newsForm');
  if (!modal || !form) return;
  if (index >= 0) {
    titleEl.textContent = 'Редактировать новость';
    const n = newsList[index];
    form['newsId'].value = index;
    form['title'].value = n.title;
    form['subtitle'].value = n.subtitle || '';
    form['date'].value = n.date || '';
    form['description'].value = n.description;
    form['link1_url'].value = n.link1_url || '';
    form['link1_text'].value = n.link1_text || '';
    form['link2_url'].value = n.link2_url || '';
    form['link2_text'].value = n.link2_text || '';
  } else {
    titleEl.textContent = 'Новая новость';
    form.reset();
    form['newsId'].value = -1;
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeNewsForm() {
  const modal = document.getElementById('newsFormModal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  document.body.style.overflow = '';
}

async function saveNewsChanges() {
  const form = document.getElementById('newsForm');
  const index = parseInt(form['newsId'].value);
  const data = {
    title: form['title'].value.trim(),
    subtitle: form['subtitle'].value.trim(),
    description: form['description'].value.trim(),
    date: form['date'].value.trim(),
    link1_url: form['link1_url'].value.trim() || null,
    link1_text: form['link1_text'].value.trim() || null,
    link2_url: form['link2_url'].value.trim() || null,
    link2_text: form['link2_text'].value.trim() || null,
    order: index >= 0 ? newsList[index].order : 0
  };

  if (data.link1_text && !data.link1_url) {
    data.link1_url = '#';
  }
  if (data.link2_text && !data.link2_url) {
    data.link2_url = '#';
  }
  try {
    if (index >= 0) {
      await api(`/api/news/${newsList[index].id}`, 'PUT', data);
    } else {
      await api('/api/news', 'POST', data);
    }
    await fetchAdminNews();
    renderNews();
    closeNewsForm();
    showToast(index >= 0 ? 'Новость обновлена' : 'Новость добавлена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

function editNews(index) { openNewsForm(index); }

async function deleteNews(index) {
  if (!confirm('Удалить новость?')) return;
  try {
    await api(`/api/news/${newsList[index].id}`, 'DELETE');
    newsList.splice(index, 1);
    renderNews();
    showToast('Новость удалена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  // Проверка прав администратора
  if (!authToken) {
    document.body.innerHTML = '<div style="text-align:center;padding:100px;"><h2>Доступ запрещён</h2><p>Войдите как администратор.</p><a href="/">На главную</a></div>';
    return;
  }
  try {
    const user = await api('/api/me');
    if (user.role !== 'admin') {
      document.body.innerHTML = '<div style="text-align:center;padding:100px;"><h2>Недостаточно прав</h2><p>Только администратор может управлять магазином.</p><a href="/">На главную</a></div>';
      return;
    }
    currentUser = user;
  } catch (e) {
    document.body.innerHTML = '<div style="text-align:center;padding:100px;"><h2>Ошибка</h2><p>Не удалось проверить права.</p></div>';
    return;
  }

  // Сразу навешиваем обработчики табов, чтобы они работали независимо от ошибок загрузки
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
      const target = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
      if (target) target.classList.remove('hidden');
    });
  });

  // Загружаем данные (обёрнуто в try/catch, чтобы ошибки не влияли на интерфейс)
  try {
    await fetchCategories();
    await fetchAdminProducts();
    await fetchAdminNews();
    await fetchAdminOrders();

    renderAdminOrders();
    renderAdminProducts();
    renderCategories();
    renderNews();
    await fetchAdminReviews();
    renderAdminReviews();
    await fetchAdminUsers();
    renderAdminUsers();
    lucide.createIcons();
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
    // Можно показать тост или оставить пустые списки
  }
});

let adminReviews = [];

async function fetchAdminReviews() {
  try {
    adminReviews = await api('/api/admin/reviews');
  } catch (e) {
    adminReviews = [];
  }
}

function renderAdminReviews() {
  const list = document.getElementById('reviewsList');
  if (!list) return;
  if (!adminReviews.length) {
    list.innerHTML = '<p class="text-sm text-onSurface-tertiary">Нет отзывов</p>';
    return;
  }
  list.innerHTML = adminReviews.map(review => `
    <div class="bg-white rounded-2xl p-4 m3-expressive-shadow dark:bg-gray-800">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-sm">${review.author}</p>
          <p class="text-xs text-onSurface-tertiary mt-0.5">${review.date}</p>
          <p class="text-sm mt-1">${review.text}</p>
          <div class="flex gap-1 mt-2 text-yellow-500 text-xs">
            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
          </div>
        </div>
        <button onclick="deleteAdminReview(${review.id})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2 text-onSurface-tertiary">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

async function deleteAdminReview(id) {
  if (!confirm('Удалить отзыв?')) return;
  try {
    await api(`/api/admin/reviews/${id}`, 'DELETE');
    adminReviews = adminReviews.filter(r => r.id !== id);
    renderAdminReviews();
    showToast('Отзыв удалён');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

let adminUsers = [];

async function fetchAdminUsers() {
  try {
    adminUsers = await api('/api/admin/users');
  } catch (e) {
    adminUsers = [];
  }
}

function renderAdminUsers() {
  const list = document.getElementById('usersList');
  if (!list) return;
  if (!adminUsers.length) {
    list.innerHTML = '<p class="text-sm text-onSurface-tertiary">Нет пользователей</p>';
    return;
  }
  list.innerHTML = adminUsers.map(user => `
    <div class="bg-white rounded-2xl p-4 m3-expressive-shadow dark:bg-gray-800 flex justify-between items-center">
      <div>
        <p class="font-bold text-sm">${user.name} ${user.surname || ''}</p>
        <p class="text-xs text-onSurface-tertiary">${user.email}</p>
        <span class="text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-rgsu-50 text-rgsu-500' : 'bg-gray-100 text-gray-600'}">${user.role}</span>
      </div>
      <div class="flex gap-2">
        <button onclick="toggleUserRole(${user.id})" class="m3-btn px-3 py-1.5 bg-surface-2 text-onSurface-secondary rounded-xl text-xs font-medium hover:bg-rgsu-50 hover:text-rgsu-500 transition-colors">
          <i data-lucide="user-cog" class="w-4 h-4 mr-1 inline"></i> ${user.role === 'admin' ? 'Сделать user' : 'Сделать admin'}
        </button>
        <button onclick="deleteAdminUser(${user.id})" class="m3-btn w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2 text-onSurface-tertiary">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

async function toggleUserRole(userId) {
  if (currentUser && userId === currentUser.id) {
    showToast('Нельзя изменить свою роль', 'alert-circle');
    return;
  }
  try {
    await api(`/api/admin/users/${userId}/role`, 'PUT');
    await fetchAdminUsers();
    renderAdminUsers();
    showToast('Роль пользователя обновлена');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}

async function deleteAdminUser(userId) {
  if (currentUser && userId === currentUser.id) {
    showToast('Нельзя удалить самого себя', 'alert-circle');
    return;
  }
  if (!confirm('Удалить пользователя? Это действие необратимо.')) return;
  try {
    await api(`/api/admin/users/${userId}`, 'DELETE');
    await fetchAdminUsers();
    renderAdminUsers();
    showToast('Пользователь удалён');
  } catch(e) { showToast(e.message, 'alert-circle'); }
}