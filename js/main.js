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
