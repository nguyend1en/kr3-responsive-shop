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
