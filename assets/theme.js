const money = (cents, currency = 'COP', showCurrencyCode = false, locale = document.documentElement.lang) => {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(cents / 100)

  return showCurrencyCode ? `${formatted} ${currency}` : formatted
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-quantity-action]')
  if (!trigger) return
  const wrapper = trigger.closest('[data-quantity]')
  const input = wrapper?.querySelector('input[type="number"]')
  if (!input) return
  const step = trigger.dataset.quantityAction === 'increase' ? 1 : -1
  input.value = Math.max(Number(input.min || 1), Number(input.value || 1) + step)
  input.dispatchEvent(new Event('change', { bubbles: true }))
})

let cartUpdateTimer
let cartUpdateInFlight = false
let cartUpdatePending = false
const updateCartQuantities = async () => {
  if (cartUpdateInFlight) { cartUpdatePending = true; return }
  const section = document.querySelector('[data-cart-section]')
  const form = section?.querySelector('.cart-form')
  if (!form || !form.checkValidity()) return
  cartUpdateInFlight = true
  section.setAttribute('aria-busy', 'true')
  try {
    const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/update.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        updates: Object.fromEntries([...form.querySelectorAll('[name="updates[]"]')].map(input => [input.dataset.cartKey, Number(input.value)])),
        sections: [section.dataset.cartSection],
        sections_url: window.location.pathname
      })
    })
    const cart = await response.json()
    if (!response.ok) throw new Error(cart.description || cart.message)
    if (!cartUpdatePending) {
      const html = cart.sections?.[section.dataset.cartSection]
      const replacement = html && new DOMParser().parseFromString(html, 'text/html').querySelector('[data-cart-section]')
      if (!replacement) { window.location.reload(); return }
      section.replaceWith(replacement)
      document.querySelectorAll('[data-cart-count]').forEach(link => { link.textContent = link.dataset.cartLabel.replace('[count]', cart.item_count) })
    }
  } catch {
    form.requestSubmit(form.querySelector('[name="update"]'))
  } finally {
    section.removeAttribute('aria-busy')
    cartUpdateInFlight = false
    if (cartUpdatePending) { cartUpdatePending = false; updateCartQuantities() }
  }
}
document.addEventListener('change', event => {
  if (!event.target.matches('.cart-form [name="updates[]"]')) return
  clearTimeout(cartUpdateTimer)
  if (cartUpdateInFlight) cartUpdatePending = true
  cartUpdateTimer = setTimeout(updateCartQuantities, 350)
})

document.querySelectorAll('[data-product-root]').forEach(root => {
  const variants = JSON.parse(root.querySelector('[data-variants-json]')?.textContent || '[]')
  const master = root.querySelector('[name="id"]')
  const price = root.querySelector('[data-product-price]')
  const submit = root.querySelector('[data-product-submit]')
  const submitLabel = submit?.querySelector('span')
  const updateSelectionPrice = () => {
    const isCards = root.dataset.cards === 'true';
    if (root.dataset.poster !== 'true' && !isCards) return;
    const variant = variants.find(item => String(item.id) === master.value);
    if (!variant) return;
    const quantityInput = root.querySelector('[name="quantity"]');
    const quantity = Math.max(1, Math.floor(Number(quantityInput?.value) || 1));
    const subtotal = variant.price * quantity;
    const discount = !isCards && quantity >= 2 && root.dataset.currency === 'COP' ? Math.min(subtotal, Number(root.dataset.posterDiscount)) : 0;
    let savingsAmount = discount;
    if (isCards && variant.cardCount > 0) {
      const reference = variants.filter(item => item.cardCount > 0).sort((a, b) => a.cardCount - b.cardCount)[0];
      savingsAmount = Math.max(0, Math.round((reference.price / reference.cardCount * variant.cardCount - variant.price) * quantity));
      const cardUnit = root.querySelector('[data-card-unit]');
      if (cardUnit) cardUnit.textContent = `${money(variant.price / variant.cardCount, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)} ${root.dataset.perCardLabel}`;
      const cardCount = root.querySelector('[data-card-count]');
      if (cardCount) cardCount.textContent = root.dataset.cardCountLabel.replace('[count]', variant.cardCount * quantity);
    }
    root.querySelectorAll('[data-card-pack-total]').forEach(total => {
      total.textContent = money(Number(total.dataset.packPrice) * quantity, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale);
    });
    const selectionPrice = root.querySelector('[data-selection-price]');
    if (selectionPrice) selectionPrice.textContent = money(subtotal - discount, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale);
    const label = root.querySelector('[data-selection-total]');
    if (label) label.textContent = root.dataset.selectionLabel.replace('[count]', quantity);
    const savings = root.querySelector('[data-selection-savings]');
    if (savings) {
      savings.hidden = !savingsAmount;
      savings.textContent = `${root.dataset.savingsLabel} ${money(savingsAmount, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)}`;
    }
  }
  const update = () => {
    const selected = [...root.querySelectorAll('[data-option-input]:checked')].map(input => input.value)
    const variant = variants.find(item => item.options.every((option, index) => option === selected[index]))
    if (!variant) return
    master.value = variant.id
    if (price) price.textContent = money(variant.price, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)
    updateSelectionPrice()
    if (submit) submit.disabled = !variant.available
    const buyNow = root.querySelector('[data-buy-now]')
    if (buyNow) buyNow.disabled = !variant.available
    if (submitLabel) submitLabel.textContent = variant.available ? submit.dataset.addLabel : submit.dataset.soldLabel
    history.replaceState({}, '', `${location.pathname}?variant=${variant.id}`)
  }
  root.querySelectorAll('[data-option-input]').forEach(input => input.addEventListener('change', update))
  const quantityInput = root.querySelector('[name="quantity"]')
  quantityInput?.addEventListener('input', updateSelectionPrice)
  quantityInput?.addEventListener('change', updateSelectionPrice)
  updateSelectionPrice()
})

document.querySelectorAll('[data-commission-calculator]').forEach(root => {
  const output = root.querySelector('[data-commission-total]')
  const timeline = root.querySelector('[data-commission-timeline]')
  const hiddenSize = root.querySelector('[data-hidden-size]')
  const hiddenSubjects = root.querySelector('[data-hidden-subjects]')
  const hiddenFinish = root.querySelector('[data-hidden-finish]')
  const hiddenEstimate = root.querySelector('[data-hidden-estimate]')
  const update = () => {
    const size = root.querySelector('[name="commission_size"]:checked')
    const subjects = root.querySelector('[name="commission_subjects"]:checked')
    const finish = root.querySelector('[name="commission_finish"]:checked')
    if (!size || !subjects || !finish) return
    root.querySelectorAll('[name="commission_finish"][data-price-small]').forEach(option => {
      const additionalPrice = size.dataset.detailSize === 'large' ? option.dataset.priceLarge : option.dataset.priceSmall
      option.dataset.price = additionalPrice
      const label = option.closest('.choice').querySelector('[data-detail-price]')
      if (label) label.textContent = `+${money(Number(additionalPrice), root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)}`
    })
    const total = Number(size.dataset.price) + Number(subjects.dataset.price) + Number(finish.dataset.price)
    const weeks = Math.max(Number(size.dataset.weeks), Number(finish.dataset.weeks))
    if (output) output.textContent = money(total, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)
    if (timeline) timeline.textContent = root.dataset.timelineLabel.replace('[count]', weeks)
    if (hiddenSize) hiddenSize.value = size.value
    if (hiddenSubjects) hiddenSubjects.value = subjects.value
    if (hiddenFinish) hiddenFinish.value = finish.value
    if (hiddenEstimate) hiddenEstimate.value = money(total, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)
  }
  root.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', update))
  update()
})

document.querySelectorAll('[data-auto-submit]').forEach(input => input.addEventListener('change', () => input.form.submit()))

const buySelectedProduct = form => {
  if (!form.reportValidity()) return;
  const root = form.closest('[data-product-root]');
  const variantId = form.querySelector('select[name="id"]')?.value;
  const variants = JSON.parse(root.querySelector('[data-variants-json]').textContent);
  const variant = variants.find(item => String(item.id) === variantId);
  if (!variant?.available) return;
  const quantity = Math.max(1, Math.floor(Number(form.querySelector('[name="quantity"]')?.value) || 1));
  window.location.assign(`${window.Shopify?.routes?.root || '/'}cart/${variantId}:${quantity}`);
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-buy-now]');
  if (!button || button.disabled) return;
  event.preventDefault();
  buySelectedProduct(button.closest('.product-form'));
})

const cartDrawer = document.getElementById('CartDrawer');
const renderCartDrawer = html => {
  const content = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-drawer-content]');
  if (!content || !cartDrawer) return false;
  cartDrawer.querySelector('[data-drawer-content]').replaceWith(content);
  return true;
}
const refreshCartDrawer = async () => {
  const response = await fetch(`${window.Shopify?.routes?.root || '/'}?sections=cart-drawer`);
  if (!response.ok) throw new Error('Cart drawer unavailable');
  const sections = await response.json();
  if (!renderCartDrawer(sections['cart-drawer'])) throw new Error('Cart drawer unavailable');
}
const openCartDrawer = () => {
  if (cartDrawer && !cartDrawer.open) cartDrawer.showModal();
}
cartDrawer?.addEventListener('click', event => {
  if (event.target.closest('[data-drawer-close]')) cartDrawer.close();
  if (event.target === cartDrawer) {
    const bounds = cartDrawer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cartDrawer.close();
  }
});
document.addEventListener('click', async event => {
  const link = event.target.closest('[data-cart-count]');
  if (!link || !cartDrawer || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  try { await refreshCartDrawer(); openCartDrawer(); } catch { window.location.assign(link.href); }
});
let drawerUpdateQueue = Promise.resolve();
const updateDrawerItem = (key, quantity) => {
  drawerUpdateQueue = drawerUpdateQueue.then(async () => {
    const error = cartDrawer.querySelector('[data-drawer-error]');
    error.hidden = true;
    cartDrawer.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/change.js`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity, sections: ['cart-drawer'], sections_url: window.location.pathname })
      });
      const cart = await response.json();
      if (!response.ok) throw new Error(cart.description || cart.message);
      const focused = cartDrawer.querySelector(':focus');
      const focusedKey = focused?.dataset.cartKey;
      if (!renderCartDrawer(cart.sections?.['cart-drawer'] || '')) await refreshCartDrawer();
      document.querySelectorAll('[data-cart-count]').forEach(link => { link.textContent = link.dataset.cartLabel.replace('[count]', cart.item_count); });
      if (focusedKey) cartDrawer.querySelector(`[data-drawer-quantity][data-cart-key="${CSS.escape(focusedKey)}"]`)?.focus();
    } catch (failure) {
      error.textContent = failure.message || cartDrawer.dataset.errorLabel;
      error.hidden = false;
    } finally { cartDrawer.removeAttribute('aria-busy'); }
  });
}
cartDrawer?.addEventListener('change', event => {
  const input = event.target.closest('[data-drawer-quantity]');
  if (input && input.checkValidity()) updateDrawerItem(input.dataset.cartKey, Number(input.value));
});
cartDrawer?.addEventListener('click', event => {
  const remove = event.target.closest('[data-drawer-remove]');
  if (remove) updateDrawerItem(remove.dataset.cartKey, 0);
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('.product-form')
  if (!form || !window.fetch) return
  event.preventDefault()
  const root = form.closest('[data-product-root]')
  const submit = form.querySelector('[data-product-submit]')
  const buyNow = form.querySelector('[data-buy-now]')
  const goToCheckout = event.submitter?.matches('[data-buy-now]')
  if (goToCheckout) { buySelectedProduct(form); return }
  const message = form.querySelector('[data-product-message]')
  submit.disabled = true
  if (buyNow) buyNow.disabled = true
  if (message) message.hidden = true
  try {
    const formData = new FormData(form)
    if (cartDrawer) { formData.set('sections', 'cart-drawer'); formData.set('sections_url', window.location.pathname) }
    const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, { method: 'POST', headers: { Accept: 'application/json' }, body: formData })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.description || payload.message)
    const cartResponse = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`)
    const cart = await cartResponse.json()
    document.querySelectorAll('[data-cart-count]').forEach(link => { link.textContent = link.dataset.cartLabel.replace('[count]', cart.item_count) })
    if (message) { message.textContent = root.dataset.addedLabel; message.hidden = false }
    if (cartDrawer) {
      try {
        if (!renderCartDrawer(payload.sections?.['cart-drawer'] || '')) await refreshCartDrawer();
        openCartDrawer();
      } catch {}
    }
  } catch (error) {
    if (message) { message.textContent = error.message; message.hidden = false }
  } finally {
    submit.disabled = false
    if (buyNow) buyNow.disabled = false
  }
})

const commissionContact = document.getElementById('CommissionContactForm')
commissionContact?.addEventListener('submit', () => {
  if (!commissionContact.checkValidity()) return
  try { sessionStorage.setItem('commissionEmail', commissionContact.querySelector('[name="contact[email]"]').value.trim()) } catch {}
})
const commissionPhotos = document.querySelector('.commission-photos-screen')
if (commissionPhotos) {
  try {
    const email = sessionStorage.getItem('commissionEmail')
    if (email) commissionPhotos.querySelector('[data-commission-email]').textContent = email
  } catch {}
  commissionPhotos.focus()
}

const commissionConfirmation = document.querySelector('[data-commission-confirmation]')
const showCommissionConfirmation = () => {
  if (!commissionConfirmation) return
  [...commissionConfirmation.parentElement.children].forEach(element => { element.hidden = element !== commissionConfirmation })
  const page = commissionConfirmation.closest('.commission-page')
  page.setAttribute('aria-labelledby', 'CommissionConfirmationTitle')
  commissionConfirmation.querySelector('h1').id = 'CommissionConfirmationTitle'
  document.title = 'Ya falta poquito. – ' + document.title.split(' – ').pop()
  commissionConfirmation.focus()
}
if (commissionConfirmation && new URLSearchParams(window.location.search).get('encargo_recibido') === 'true') showCommissionConfirmation()

if (commissionPhotos && commissionConfirmation) {
  const observedRoots = new WeakSet()
  const observePhotoForms = () => {
    commissionPhotos.querySelectorAll('shopify-forms-embed').forEach(embed => {
      const root = embed.shadowRoot
      if (!root || observedRoots.has(root)) return
      observedRoots.add(root)
      const checkSuccess = () => {
        if (!root.querySelector('#app-embed[data-current-step="success"]')) return
        successObserver.disconnect()
        hostObserver.disconnect()
        showCommissionConfirmation()
      }
      const successObserver = new MutationObserver(checkSuccess)
      successObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-current-step'] })
      checkSuccess()
    })
  }
  const hostObserver = new MutationObserver(observePhotoForms)
  hostObserver.observe(commissionPhotos, { childList: true, subtree: true })
  customElements.whenDefined('shopify-forms-embed').then(observePhotoForms)
  observePhotoForms()
}
