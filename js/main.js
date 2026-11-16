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

    form.reset();
    if ('clearCart' in form.dataset) saveCart([]);
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
  const STORAGE_KEY = 'shopproject-chat';
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
const CART_KEY = 'shopproject-cart';

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
  return `${value.toLocaleString('ru-RU')} руб.`;
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

// кнопки «В корзину» в карточках и на странице товара
document.querySelectorAll('.product-card__cart, .product-detail__cart').forEach((button) => {
  button.addEventListener('click', () => {
    const cart = loadCart();
    const found = cart.find((item) => item.id === button.dataset.id);
    if (found) {
      found.qty = Math.min(found.qty + 1, 10);
    } else {
      cart.push({
        id: button.dataset.id,
        name: button.dataset.name,
        category: button.dataset.category,
        price: Number(button.dataset.price),
        oldPrice: Number(button.dataset.oldPrice) || 0,
        qty: 1,
      });
    }
    saveCart(cart);
    showMessage(`«${button.dataset.name}» в корзине. Товаров: ${cartQuantity(cart)}`);
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
