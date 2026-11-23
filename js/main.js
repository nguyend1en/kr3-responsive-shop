// Минимальная логика: мобильное меню, модальное окно и обработка форм.

// Мобильное меню: кнопка «Меню» открывает и закрывает список ссылок.
// aria-expanded сообщает экранному диктору, открыто меню или нет.
const nav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.site-nav__toggle');

function setMenu(open) {
  nav.classList.toggle('site-nav--open', open);
  navToggle.setAttribute('aria-expanded', String(open));
}

if (nav && navToggle) {
  navToggle.addEventListener('click', () => {
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  // Esc закрывает меню и возвращает фокус на кнопку
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('site-nav--open')) {
      setMenu(false);
      navToggle.focus();
    }
  });

  // после перехода по ссылке меню закрывается
  nav.querySelectorAll('.site-nav__link').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });
}

const dialog = document.getElementById('order-dialog');
const message = document.getElementById('success-message');

// текст сообщения берётся из data-success формы (или стандартный)
const defaultMessage = message ? message.textContent : '';

function showMessage(text) {
  if (!message) return;
  message.textContent = text || defaultMessage;
  message.hidden = false;
  setTimeout(() => {
    message.hidden = true;
  }, 4000);
}

if (dialog) {
  const selectedProduct = document.getElementById('selected-product');
  const closeButton = document.getElementById('close-order-dialog');

  // Кнопки «Заказать» (в карточках и на странице товара):
  // записываем товар в скрытое поле и открываем окно.
  document.querySelectorAll('.product-card__button, .product-detail__button').forEach((button) => {
    button.addEventListener('click', () => {
      selectedProduct.value = button.dataset.product;
      dialog.showModal();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());

  // Закрытие по клику на затемнённый фон
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

// Обработка форм: проверка, подсветка ошибок, сообщение об успехе.
document.querySelectorAll('.order-form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    // Backend пока не подключён, поэтому отменяем стандартную отправку.
    event.preventDefault();

    const elements = Array.from(form.elements);
    elements.forEach((element) => {
      if (element.willValidate) element.removeAttribute('aria-invalid');
    });

    if (!form.checkValidity()) {
      elements.forEach((element) => {
        if (element.willValidate && !element.checkValidity()) {
          element.setAttribute('aria-invalid', 'true');
        }
      });
      form.reportValidity();
      return;
    }

    if (form.dataset.account && !handleAccount(form)) return;

    form.reset();
    if ('clearCart' in form.dataset) {
      recordOrder(loadCart());
      saveCart([]);
    }
    if (dialog && dialog.open) dialog.close();
    showMessage(form.dataset.success);
  });
});

// Чат поддержки. Сообщение уходит менеджеру магазина — отвечает
// сотрудник, а не бот. Пока нет backend, сообщения сохраняются
// в браузере (localStorage), чтобы не пропадали при переходе по страницам.
const chatToggle = document.querySelector('.chat__toggle');
const chatPanel = document.getElementById('chat-panel');

if (chatToggle && chatPanel) {
  const chatClose = chatPanel.querySelector('.chat__close');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatList = chatPanel.querySelector('.chat__messages');
  const STORAGE_KEY = 'pinout-chat';
  let noteShown = false;
  let history = [];

  function setChat(open) {
    chatPanel.hidden = !open;
    chatToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      chatList.scrollTop = chatList.scrollHeight;
      chatInput.focus();
    }
  }

  // createElement + textContent: текст пользователя не выполняется как HTML
  function addMessage(text, time) {
    const item = document.createElement('li');
    item.className = 'chat__message chat__message--user';
    const body = document.createElement('p');
    body.className = 'chat__text';
    body.textContent = text;
    const stamp = document.createElement('time');
    stamp.className = 'chat__time';
    stamp.textContent = time;
    item.append(body, stamp);
    chatList.append(item);
    chatList.scrollTop = chatList.scrollHeight;
  }

  function addNote(text) {
    const note = document.createElement('li');
    note.className = 'chat__note';
    note.textContent = text;
    chatList.append(note);
  }

  try {
    history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    history = [];
  }
  history.forEach((message) => addMessage(message.text, message.time));

  chatToggle.addEventListener('click', () => setChat(chatPanel.hidden));

  chatClose.addEventListener('click', () => {
    setChat(false);
    chatToggle.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !chatPanel.hidden) {
      setChat(false);
      chatToggle.focus();
    }
  });

  // Enter — отправить, Shift+Enter — новая строка
  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    addMessage(text, time);
    history.push({ text, time });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20)));
    } catch (error) {
      // хранилище недоступно — сообщение просто не сохранится
    }
    chatInput.value = '';

    if (!noteShown) {
      addNote('Сообщение передано менеджеру. Ответ придёт в этот чат в рабочее время.');
      noteShown = true;
    }
  });
}

// ===== Корзина =====
// Товары хранятся в localStorage браузера (пока нет backend),
// поэтому корзина сохраняется при переходе между страницами.
const CART_KEY = 'pinout-cart';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    // хранилище недоступно — корзина не сохранится
  }
  updateCartCount(cart);
}

function cartQuantity(cart) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function formatRub(value) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

// 1 товар, 2 товара, 5 товаров
function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

// счётчик на иконке корзины в шапке
function updateCartCount(cart = loadCart()) {
  document.querySelectorAll('.header-actions__count-value').forEach((counter) => {
    counter.textContent = cartQuantity(cart);
  });
}

updateCartCount();

// добавить товар в корзину (данные берутся из data-атрибутов)
function addToCart(cart, data) {
  const found = cart.find((item) => item.id === data.id);
  if (found) {
    found.qty = Math.min(found.qty + 1, 10);
  } else {
    cart.push({
      id: data.id,
      name: data.name,
      category: data.category,
      price: Number(data.price),
      oldPrice: Number(data.oldPrice) || 0,
      qty: 1,
    });
  }
}

// кнопки «В корзину» в карточках и на странице товара
document.querySelectorAll('.product-card__cart, .product-detail__cart').forEach((button) => {
  button.addEventListener('click', () => {
    const cart = loadCart();
    addToCart(cart, button.dataset);
    saveCart(cart);
    showMessage(`«${button.dataset.name}» в корзине. Товаров: ${cartQuantity(cart)}`);
  });
});

// готовые наборы: одна кнопка добавляет все детали набора
document.querySelectorAll('.kit-card__cart').forEach((button) => {
  button.addEventListener('click', () => {
    const cart = loadCart();
    button.closest('.kit-card').querySelectorAll('.kit-card__part').forEach((part) => {
      addToCart(cart, part.dataset);
    });
    saveCart(cart);
    showMessage(`Набор «${button.dataset.kit}» в корзине. Товаров: ${cartQuantity(cart)}`);
  });
});

// страница корзины: список строится из localStorage
const cartList = document.getElementById('cart-list');

if (cartList) {
  const cartTitle = document.getElementById('cart-title');
  const cartStatus = document.getElementById('cart-status');
  const cartEmpty = document.getElementById('cart-empty');
  const checkout = document.getElementById('cart-checkout');

  function createPicture(item) {
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = `images/products/${item.id}-480.webp 480w`;
    const img = document.createElement('img');
    img.className = 'cart-item__image';
    img.src = `images/products/${item.id}-480.jpg`;
    img.alt = item.name;
    img.width = 480;
    img.height = 320;
    img.loading = 'lazy';
    picture.append(source, img);
    return picture;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createCartItem(item) {
    const li = createElement('li', 'cart-item');
    li.dataset.id = item.id;

    const info = createElement('div', 'cart-item__info');
    const title = createElement('h3', 'cart-item__title');
    const link = createElement('a', 'cart-item__link', item.name);
    link.href = 'product.html';
    title.append(link);
    const price = createElement('p', 'cart-item__price', formatRub(item.price));
    if (item.oldPrice) {
      const old = createElement('s', 'cart-item__old-price', formatRub(item.oldPrice));
      price.append(' ', old);
    }
    info.append(createElement('p', 'cart-item__category', item.category), title, price);

    const controls = createElement('div', 'cart-item__controls');
    const label = createElement('label', 'cart-item__qty-label', 'Количество');
    label.htmlFor = `qty-${item.id}`;
    const hidden = createElement('span', 'visually-hidden', ` «${item.name}»`);
    label.append(hidden);
    const input = createElement('input', 'cart-item__qty');
    input.type = 'number';
    input.id = `qty-${item.id}`;
    input.min = '1';
    input.max = '10';
    input.value = item.qty;
    input.inputMode = 'numeric';
    const sum = createElement('p', 'cart-item__sum', formatRub(item.price * item.qty));
    const remove = createElement('button', 'cart-item__remove', 'Удалить');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Удалить «${item.name}» из корзины`);
    controls.append(label, input, sum, remove);

    li.append(createPicture(item), info, controls);
    return li;
  }

  function renderSummary() {
    const cart = loadCart();
    const qty = cartQuantity(cart);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const full = cart.reduce((sum, item) => sum + (item.oldPrice || item.price) * item.qty, 0);

    document.getElementById('cart-count').textContent = `${qty} ${plural(qty, ['товар', 'товара', 'товаров'])}`;
    document.getElementById('summary-items-label').textContent = `Товары (${qty})`;
    document.getElementById('summary-items').textContent = formatRub(full);
    document.getElementById('summary-discount').textContent = full > total ? `−${formatRub(full - total)}` : formatRub(0);
    document.getElementById('summary-delivery').textContent = total >= 5000 || total === 0 ? 'Бесплатно' : formatRub(300);
    document.getElementById('summary-total').textContent = formatRub(total + (total > 0 && total < 5000 ? 300 : 0));

    // пустая корзина: показываем подсказку и блокируем оформление
    cartEmpty.hidden = cart.length > 0;
    checkout.classList.toggle('button--disabled', cart.length === 0);
    if (cart.length === 0) {
      checkout.setAttribute('aria-disabled', 'true');
    } else {
      checkout.removeAttribute('aria-disabled');
    }
  }

  function renderCart() {
    cartList.replaceChildren(...loadCart().map(createCartItem));
    renderSummary();
  }

  // изменение количества
  cartList.addEventListener('change', (event) => {
    if (!event.target.classList.contains('cart-item__qty')) return;
    const li = event.target.closest('.cart-item');
    const cart = loadCart();
    const item = cart.find((entry) => entry.id === li.dataset.id);
    const qty = Math.min(Math.max(parseInt(event.target.value, 10) || 1, 1), 10);
    event.target.value = qty;
    item.qty = qty;
    saveCart(cart);
    li.querySelector('.cart-item__sum').textContent = formatRub(item.price * qty);
    renderSummary();
  });

  // удаление товара
  cartList.addEventListener('click', (event) => {
    const button = event.target.closest('.cart-item__remove');
    if (!button) return;
    const li = button.closest('.cart-item');
    const cart = loadCart();
    const removed = cart.find((entry) => entry.id === li.dataset.id);
    saveCart(cart.filter((entry) => entry.id !== li.dataset.id));
    li.remove();
    renderSummary();
    // фокус возвращается к заголовку, диктор сообщает об удалении
    cartTitle.focus();
    cartStatus.textContent = `«${removed.name}» удалён из корзины`;
  });

  checkout.addEventListener('click', (event) => {
    if (checkout.getAttribute('aria-disabled') === 'true') event.preventDefault();
  });

  renderCart();
}

// ===== Личный кабинет =====
// Backend ещё нет, поэтому аккаунты, вход и заказы хранятся
// в localStorage. Демо-аккаунт для проверки описан в README.
// Хранить пароль в браузере допустимо только в учебном демо!
const USERS_KEY = 'pinout-users';
const SESSION_KEY = 'pinout-session';
const DEMO_USER = {
  name: 'Dien',
  email: 'admin@pinout.ru',
  password: 'admin123',
  phone: '+7 (900) 123-45-67',
  orders: [
    { id: 10517, date: '12.11.2026', items: 'ESP32-DevKitC V4 × 2, Датчик BME280 × 2', total: 2860, status: 'В пути' },
    { id: 10482, date: '02.11.2026', items: 'Raspberry Pi 5, 4 ГБ × 1', total: 8490, status: 'Доставлен' },
  ],
};

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // хранилище недоступно
  }
}

// демо-аккаунт всегда есть в списке пользователей
function getUsers() {
  const users = readJSON(USERS_KEY, []);
  if (!users.some((user) => user.email === DEMO_USER.email)) {
    users.unshift(JSON.parse(JSON.stringify(DEMO_USER)));
  }
  return users;
}

function currentUser() {
  const email = readJSON(SESSION_KEY, null);
  return email ? getUsers().find((user) => user.email === email) || null : null;
}

// заказ из корзины попадает в историю вошедшего пользователя
function recordOrder(cart) {
  const email = readJSON(SESSION_KEY, null);
  if (!email || cart.length === 0) return;
  const users = getUsers();
  const user = users.find((entry) => entry.email === email);
  if (!user) return;
  const sum = cart.reduce((total, item) => total + item.price * item.qty, 0);
  user.orders.unshift({
    id: 10000 + (Date.now() % 90000),
    date: new Date().toLocaleDateString('ru-RU'),
    items: cart.map((item) => `${item.name} × ${item.qty}`).join(', '),
    total: sum + (sum < 5000 ? 300 : 0),
    status: 'Принят',
  });
  writeJSON(USERS_KEY, users);
}

// вызывается из общего обработчика форм; true — вход выполнен
function handleAccount(form) {
  const users = getUsers();
  if (form.dataset.account === 'login') {
    const email = form.elements.email.value.trim().toLowerCase();
    const user = users.find((entry) => entry.email === email && entry.password === form.elements.password.value);
    const error = document.getElementById('login-error');
    if (!user) {
      error.hidden = false;
      form.elements.password.setAttribute('aria-invalid', 'true');
      form.elements.password.focus();
      return false;
    }
    error.hidden = true;
    writeJSON(SESSION_KEY, user.email);
  } else {
    const email = form.elements.email.value.trim().toLowerCase();
    const error = document.getElementById('register-error');
    if (users.some((entry) => entry.email === email)) {
      error.hidden = false;
      form.elements.email.setAttribute('aria-invalid', 'true');
      form.elements.email.focus();
      return false;
    }
    error.hidden = true;
    users.push({
      name: form.elements.name.value.trim(),
      email,
      password: form.elements.password.value,
      phone: form.elements.phone.value,
      orders: [],
    });
    writeJSON(USERS_KEY, users);
    writeJSON(SESSION_KEY, email);
  }
  renderAccount(true);
  return true;
}

function renderAccount(moveFocus = false) {
  const user = currentUser();

  // в шапке вместо «Войти» — имя пользователя
  document.querySelectorAll('.header-actions__link[href="account.html"] .header-actions__text').forEach((label) => {
    label.textContent = user ? user.name : 'Войти';
  });

  const auth = document.getElementById('account-auth');
  const profile = document.getElementById('account-profile');
  if (!auth || !profile) return;

  auth.hidden = Boolean(user);
  profile.hidden = !user;
  if (!user) return;

  document.getElementById('profile-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-phone').textContent = user.phone;

  const spent = user.orders.reduce((total, order) => total + order.total, 0);
  document.getElementById('stat-orders').textContent = user.orders.length;
  document.getElementById('stat-spent').textContent = formatRub(spent);
  document.getElementById('stat-bonus').textContent = Math.round(spent * 0.05).toLocaleString('ru-RU');

  const body = document.getElementById('orders-body');
  const statusClass = { 'Доставлен': 'done', 'В пути': 'way', 'Принят': 'new' };
  body.replaceChildren(...user.orders.map((order) => {
    const row = document.createElement('tr');
    row.className = 'data-table__row';
    const cells = [`№ ${order.id}`, order.date, order.items, formatRub(order.total)];
    cells.forEach((text, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      cell.className = index === 0 ? 'data-table__row-head' : 'data-table__cell';
      if (index === 0) cell.scope = 'row';
      cell.textContent = text;
      row.append(cell);
    });
    const statusCell = document.createElement('td');
    statusCell.className = 'data-table__cell';
    const badge = document.createElement('span');
    badge.className = `order-status order-status--${statusClass[order.status] || 'new'}`;
    badge.textContent = order.status;
    statusCell.append(badge);
    row.append(statusCell);
    return row;
  }));
  document.getElementById('orders-empty').hidden = user.orders.length > 0;

  if (moveFocus) document.getElementById('profile-title').focus();
}

const logout = document.getElementById('logout');
if (logout) {
  logout.addEventListener('click', () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      // ничего
    }
    renderAccount();
    document.getElementById('login-email').focus();
    showMessage('Вы вышли из личного кабинета.');
  });
}

renderAccount();

// кнопка «Спросить техподдержку» открывает чат (без JS ведёт к форме на странице «Контакты»)
document.querySelectorAll('[data-open-chat]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (!chatToggle || !chatPanel) return;
    event.preventDefault();
    if (chatPanel.hidden) chatToggle.click();
  });
});

// ===== Анимации =====
// Если в системе включено «Уменьшить движение», анимации не запускаются.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. Появление блоков при прокрутке: IntersectionObserver добавляет класс is-visible
const revealItems = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

// 2. Прогресс прокрутки (полоса сверху) и плотная шапка после начала прокрутки.
// Доля прокрутки 0..1 записывается в CSS-переменную --progress.
const siteHeader = document.querySelector('.site-header');
const scrollHandlers = [];

function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  document.documentElement.style.setProperty('--progress', ratio.toFixed(3));
  if (siteHeader) siteHeader.classList.toggle('site-header--scrolled', window.scrollY > 10);
  scrollHandlers.forEach((handler) => handler());
}

window.addEventListener('scroll', onScroll, { passive: true });

// 3. Счётчики в первом экране: число «набегает» от 0 до значения из data-count
function runCounter(element) {
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix || '';
  const start = performance.now();
  const duration = 1400;
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    element.textContent = Math.round(target * eased).toLocaleString('ru-RU') + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (!reduceMotion) {
  document.querySelectorAll('[data-count]').forEach(runCounter);
}

// 4. «Монитор порта»: строки печатаются по одной букве. Без JS текст виден сразу.
const terminalLines = document.querySelectorAll('.terminal__line');
if (terminalLines.length && !reduceMotion) {
  const texts = Array.from(terminalLines, (line) => line.innerHTML);
  terminalLines.forEach((line) => {
    line.textContent = '';
  });
  const cursor = document.createElement('span');
  cursor.className = 'terminal__cursor';

  let lineIndex = 0;
  function typeLine() {
    if (lineIndex >= texts.length) return;
    const line = terminalLines[lineIndex];
    const holder = document.createElement('div');
    holder.innerHTML = texts[lineIndex];
    const plain = holder.textContent;
    let charIndex = 0;
    const timer = setInterval(() => {
      charIndex += 1;
      line.textContent = plain.slice(0, charIndex);
      line.append(cursor);
      if (charIndex >= plain.length) {
        clearInterval(timer);
        line.innerHTML = texts[lineIndex]; // возвращаем подсветку «OK»
        line.append(cursor);
        lineIndex += 1;
        setTimeout(typeLine, 350);
      }
    }, 28);
  }
  setTimeout(typeLine, 700);
}

// 5. Отклик на «В корзину»: кнопка и счётчик в шапке коротко «пульсируют»
function pulse(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // перезапуск CSS-анимации
  element.classList.add(className);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('.product-card__cart, .product-detail__cart, .kit-card__cart');
  if (!button || button.disabled) return;
  pulse(button, 'is-added');
  document.querySelectorAll('.header-actions__count').forEach((count) => pulse(count, 'is-bumped'));
});

// ===== Кнопка «Наверх» — микросхема =====
// Появляется после прокрутки на 600px; заливка корпуса следует за --progress.
const toTop = document.querySelector('.to-top');
if (toTop) {
  scrollHandlers.push(() => {
    toTop.classList.toggle('is-visible', window.scrollY > 600);
  });

  // #top — это «липкая» шапка: она всегда у верхнего края экрана, поэтому
  // переход по якорю почти не прокручивает страницу. Прокручиваем к началу сами.
  toTop.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    document.querySelector('.site-header__logo').focus({ preventScroll: true });
  });
}

onScroll();

// ===== Избранное =====
// Сердечко на карточке сохраняет товар в localStorage. В каталоге есть фильтр
// «Только избранное», в личном кабинете — список избранных товаров.
const FAV_KEY = 'pinout-favorites';

function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveFavs(favs) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  } catch (error) {
    // хранилище недоступно — избранное работает до перезагрузки страницы
  }
  updateFavs();
}

const favFilter = document.querySelector('.catalog__fav-filter');
const catalogCount = document.querySelector('.catalog__count');
const catalogEmpty = document.querySelector('.catalog__empty');

// показывает в каталоге все товары или только избранные
function applyFavFilter() {
  if (!favFilter) return;
  const onlyFavs = favFilter.getAttribute('aria-pressed') === 'true';
  const ids = loadFavs().map((item) => item.id);
  let visible = 0;
  document.querySelectorAll('#catalog-grid .product-card').forEach((card) => {
    const button = card.querySelector('.product-card__fav');
    const show = !onlyFavs || (button && ids.includes(button.dataset.id));
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (catalogCount) catalogCount.textContent = `Найдено: ${visible} ${plural(visible, ['товар', 'товара', 'товаров'])}`;
  if (catalogEmpty) catalogEmpty.hidden = !(onlyFavs && visible === 0);
}

// список избранного в личном кабинете (элементы создаются через createElement)
function renderFavList() {
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  if (!list) return;
  const favs = loadFavs();
  list.replaceChildren();
  favs.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'favorite-item';

    const img = document.createElement('img');
    img.className = 'favorite-item__image';
    img.src = `images/products/${item.id}-480.jpg`;
    img.alt = item.name;
    img.width = 88;
    img.height = 59;
    img.loading = 'lazy';

    const info = document.createElement('div');
    const category = document.createElement('p');
    category.className = 'favorite-item__category';
    category.textContent = item.category;
    const title = document.createElement('h3');
    title.className = 'favorite-item__title';
    const link = document.createElement('a');
    link.className = 'favorite-item__link';
    link.href = 'product.html';
    link.textContent = item.name;
    title.append(link);
    const price = document.createElement('p');
    price.className = 'favorite-item__price';
    price.textContent = formatRub(item.price);
    info.append(category, title, price);

    const remove = document.createElement('button');
    remove.className = 'favorite-item__remove';
    remove.type = 'button';
    remove.textContent = 'Убрать из избранного';
    remove.addEventListener('click', () => {
      saveFavs(loadFavs().filter((fav) => fav.id !== item.id));
      showMessage(`«${item.name}» удалён из избранного`);
    });

    li.append(img, info, remove);
    list.append(li);
  });
  if (empty) empty.hidden = favs.length > 0;
}

function updateFavs() {
  const favs = loadFavs();
  const ids = favs.map((item) => item.id);
  document.querySelectorAll('.product-card__fav').forEach((button) => {
    button.setAttribute('aria-pressed', String(ids.includes(button.dataset.id)));
  });
  document.querySelectorAll('.fav-count').forEach((count) => {
    count.textContent = favs.length;
  });
  applyFavFilter();
  renderFavList();
}

document.querySelectorAll('.product-card__fav').forEach((button) => {
  button.addEventListener('click', () => {
    const favs = loadFavs();
    const { id, name, category, price } = button.dataset;
    if (favs.some((item) => item.id === id)) {
      saveFavs(favs.filter((item) => item.id !== id));
      showMessage(`«${name}» удалён из избранного`);
    } else {
      favs.push({ id, name, category, price: Number(price) });
      saveFavs(favs);
      showMessage(`«${name}» добавлен в избранное`);
    }
  });
});

if (favFilter) {
  favFilter.addEventListener('click', () => {
    const pressed = favFilter.getAttribute('aria-pressed') === 'true';
    favFilter.setAttribute('aria-pressed', String(!pressed));
    applyFavFilter();
  });
  // ссылка catalog.html#favorites сразу включает фильтр
  if (window.location.hash === '#favorites') favFilter.setAttribute('aria-pressed', 'true');
}

updateFavs();
