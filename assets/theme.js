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
  const stock = root.querySelector('[data-stock-meter]')
  const stockLabel = root.querySelector('[data-stock-label]')
  const stockBar = root.querySelector('[data-stock-bar]')
  const update = () => {
    const selected = [...root.querySelectorAll('[data-option-input]:checked')].map(input => input.value)
    const variant = variants.find(item => item.options.every((option, index) => option === selected[index]))
    if (!variant) return
    master.value = variant.id
    if (price) price.textContent = money(variant.price, root.dataset.currency, root.dataset.showCurrencyCode === 'true', root.dataset.locale)
    if (submit) submit.disabled = !variant.available
    const buyNow = root.querySelector('[data-buy-now]')
    if (buyNow) buyNow.disabled = !variant.available
    if (submitLabel) submitLabel.textContent = variant.available ? submit.dataset.addLabel : submit.dataset.soldLabel
    if (stock && variant.tracked) {
      const total = Number(variant.editionSize || 0)
      const remaining = Math.max(variant.inventoryQuantity, 0)
      stock.hidden = false
      stock.classList.toggle('low', remaining <= 5)
      if (stockLabel) stockLabel.textContent = total ? root.dataset.remainingLabel.replace('[count]', remaining).replace('[total]', total) : remaining
      if (stockBar) stockBar.style.width = total ? `${Math.min(100, remaining / total * 100)}%` : '100%'
    } else if (stock) {
      stock.hidden = true
    }
    history.replaceState({}, '', `${location.pathname}?variant=${variant.id}`)
  }
  root.querySelectorAll('[data-option-input]').forEach(input => input.addEventListener('change', update))
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

document.addEventListener('submit', async event => {
  const form = event.target.closest('.product-form')
  if (!form || !window.fetch) return
  event.preventDefault()
  const root = form.closest('[data-product-root]')
  const submit = form.querySelector('[data-product-submit]')
  const buyNow = form.querySelector('[data-buy-now]')
  const goToCheckout = event.submitter?.matches('[data-buy-now]')
  const message = form.querySelector('[data-product-message]')
  submit.disabled = true
  if (buyNow) buyNow.disabled = true
  if (message) message.hidden = true
  try {
    const response = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.description || payload.message)
    if (goToCheckout) {
      window.location.assign(`${window.Shopify?.routes?.root || '/'}checkout`)
      return
    }
    const cartResponse = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`)
    const cart = await cartResponse.json()
    document.querySelectorAll('[data-cart-count]').forEach(link => { link.textContent = link.dataset.cartLabel.replace('[count]', cart.item_count) })
    if (message) { message.textContent = root.dataset.addedLabel; message.hidden = false }
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
