import { calculateBookingPrice, formatPrice, toUtcTime } from './bookingPrice.js'

export const BOOKING_LIMITS = {
  name: 100,
  phone: 50,
  eventType: 100,
  comment: 500,
  services: 10,
  dishes: 30,
  nights: 365,
}

export const MIN_FORM_DURATION_MS = 2500
export const TELEGRAM_MESSAGE_LIMIT = 3900

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isFiniteNonNegative = (value) => Number.isFinite(Number(value)) && Number(value) >= 0
const isIntegerInRange = (value, minimum, maximum) => {
  const number = Number(value)
  return Number.isInteger(number) && number >= minimum && number <= maximum
}

const validString = (value, minimum, maximum) => (
  typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum
)

export const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

export const truncateText = (value, maximum) => {
  const text = String(value).trim()
  if (text.length <= maximum) return text
  return `${text.slice(0, Math.max(0, maximum - 20)).trimEnd()}… Текст сокращён`
}

export const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = toUtcTime(value)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

export const createBookingPayload = (form, calculation, formStartedAt) => ({
  name: form.name,
  phone: form.phone,
  checkIn: form.checkIn,
  checkOut: form.checkOut,
  guests: form.guests,
  childrenNoBed: form.childrenNoBed,
  eventType: form.eventType,
  bathSessions: form.bathSessions,
  boatDays: form.boatDays,
  foldingBeds: form.foldingBeds,
  oakBrooms: form.oakBrooms,
  firewoodBuckets: form.firewoodBuckets,
  comment: form.comment,
  consent: form.consent,
  website: form.website,
  formStartedAt,
  calculation: {
    ready: calculation.ready,
    nights: calculation.nights,
    tariff: calculation.tariff,
    stayPrice: calculation.stayPrice,
    extras: calculation.extras?.map(({ label, count, price, total }) => ({ label, count, price, total })) || [],
    extrasTotal: calculation.extrasTotal,
    total: calculation.total,
  },
})

const validateClientCalculation = (clientCalculation, serverCalculation) => {
  if (!isObject(clientCalculation) || clientCalculation.ready !== true) return false
  if (!isIntegerInRange(clientCalculation.nights, 1, BOOKING_LIMITS.nights)) return false
  if (!validString(clientCalculation.tariff, 1, 100)) return false
  if (!isFiniteNonNegative(clientCalculation.stayPrice)) return false
  if (!isFiniteNonNegative(clientCalculation.extrasTotal)) return false
  if (!isFiniteNonNegative(clientCalculation.total)) return false
  if (!Array.isArray(clientCalculation.extras) || clientCalculation.extras.length > BOOKING_LIMITS.services) return false

  const validExtras = clientCalculation.extras.every((item) => (
    isObject(item)
    && validString(item.label, 1, 100)
    && isIntegerInRange(item.count, 1, 30)
    && isFiniteNonNegative(item.price)
    && isFiniteNonNegative(item.total)
    && Number(item.count) * Number(item.price) === Number(item.total)
  ))
  if (!validExtras) return false

  const sameExtras = clientCalculation.extras.length === serverCalculation.extras.length
    && clientCalculation.extras.every((item, index) => {
      const serverItem = serverCalculation.extras[index]
      return serverItem
        && Number(item.count) === serverItem.count
        && Number(item.price) === serverItem.price
        && Number(item.total) === serverItem.total
    })

  return sameExtras
    && Number(clientCalculation.nights) === serverCalculation.nights
    && Number(clientCalculation.stayPrice) === serverCalculation.stayPrice
    && Number(clientCalculation.extrasTotal) === serverCalculation.extrasTotal
    && Number(clientCalculation.total) === serverCalculation.total
}

export const validateBookingPayload = (payload, { pricing, eventTypes }) => {
  if (!isObject(payload)) return { ok: false }

  if (!validString(payload.name, 1, BOOKING_LIMITS.name)) return { ok: false }
  if (!validString(payload.phone, 1, BOOKING_LIMITS.phone)) return { ok: false }
  if (!isValidDate(payload.checkIn) || !isValidDate(payload.checkOut)) return { ok: false }

  const checkInTime = toUtcTime(payload.checkIn)
  const checkOutTime = toUtcTime(payload.checkOut)
  const nights = Math.round((checkOutTime - checkInTime) / (24 * 60 * 60 * 1000))
  if (!isIntegerInRange(nights, 1, BOOKING_LIMITS.nights)) return { ok: false }
  if (!isIntegerInRange(payload.guests, 1, pricing.daily.maxGuests)) return { ok: false }
  if (!isIntegerInRange(payload.childrenNoBed, 0, 20)) return { ok: false }
  if (!validString(payload.eventType, 1, BOOKING_LIMITS.eventType) || !eventTypes.includes(payload.eventType)) return { ok: false }
  if (!isIntegerInRange(payload.bathSessions, 0, 10)) return { ok: false }
  if (!isIntegerInRange(payload.boatDays, 0, 30)) return { ok: false }
  if (!isIntegerInRange(payload.foldingBeds, 0, 3)) return { ok: false }
  if (!isIntegerInRange(payload.oakBrooms, 0, 20)) return { ok: false }
  if (!isIntegerInRange(payload.firewoodBuckets, 0, 20)) return { ok: false }
  if (typeof payload.comment !== 'string' || payload.comment.length > BOOKING_LIMITS.comment) return { ok: false }
  if (payload.consent !== true) return { ok: false }
  if (!Number.isFinite(Number(payload.formStartedAt)) || Number(payload.formStartedAt) <= 0) return { ok: false }

  const form = {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: String(Number(payload.guests)),
    childrenNoBed: String(Number(payload.childrenNoBed)),
    eventType: payload.eventType,
    bathSessions: String(Number(payload.bathSessions)),
    boatDays: String(Number(payload.boatDays)),
    foldingBeds: String(Number(payload.foldingBeds)),
    oakBrooms: String(Number(payload.oakBrooms)),
    firewoodBuckets: String(Number(payload.firewoodBuckets)),
    comment: payload.comment.trim(),
  }

  const calculation = calculateBookingPrice(form, pricing)
  if (!calculation.ready || calculation.nights !== nights) return { ok: false }
  if (![calculation.stayPrice, calculation.extrasTotal, calculation.total].every(Number.isFinite)) return { ok: false }
  if (!validateClientCalculation(payload.calculation, calculation)) return { ok: false }

  return { ok: true, data: { form, calculation } }
}

export const getSpamReason = (payload, currentTime = Date.now()) => {
  if (!isObject(payload)) return ''
  if (typeof payload.website === 'string' && payload.website.trim()) return 'honeypot'

  const startedAt = Number(payload.formStartedAt)
  if (!Number.isFinite(startedAt) || startedAt <= 0) return ''
  const elapsed = currentTime - startedAt
  if (elapsed < MIN_FORM_DURATION_MS) return 'too-fast'
  return ''
}

export const formatSelectedServices = (services) => {
  if (!Array.isArray(services) || services.length === 0) return ''
  const lines = services.slice(0, BOOKING_LIMITS.services).map((item) => (
    `• ${escapeHtml(truncateText(item.label, 80))} × ${Number(item.count)} — ${formatPrice(Number(item.total))}`
  ))
  if (services.length > BOOKING_LIMITS.services) lines.push('<i>Текст сокращён</i>')
  return lines.join('\n')
}

export const formatSelectedDishes = (dishes) => {
  if (!Array.isArray(dishes) || dishes.length === 0) return ''
  const lines = dishes.slice(0, BOOKING_LIMITS.dishes).map((item) => (
    `• ${escapeHtml(truncateText(item.name, 80))} × ${Number(item.count)} — ${formatPrice(Number(item.total))}`
  ))
  if (dishes.length > BOOKING_LIMITS.dishes) lines.push('<i>Текст сокращён</i>')
  return lines.join('\n')
}

const formatReceivedAt = (value) => new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(value)

export const buildTelegramMessage = ({ form, calculation, receivedAt = new Date(), dishes = [] }) => {
  const services = formatSelectedServices(calculation.extras)
  const selectedDishes = formatSelectedDishes(dishes)
  const children = Number(form.childrenNoBed)
  const safeComment = form.comment ? escapeHtml(truncateText(form.comment, 400)) : ''

  const fixedStart = [
    '🏡 <b>Новая заявка на бронирование</b>',
    `👤 <b>Клиент:</b> ${escapeHtml(truncateText(form.name, 80))}\n📞 <b>Телефон:</b> ${escapeHtml(truncateText(form.phone, 40))}`,
    `📅 <b>Заезд:</b> ${escapeHtml(form.checkIn)}\n📅 <b>Выезд:</b> ${escapeHtml(form.checkOut)}\n🌙 <b>Суток:</b> ${calculation.nights}\n👥 <b>Гостей:</b> ${calculation.guests}${children > 0 ? `\n👶 <b>Детей без отдельного места:</b> ${children}` : ''}`,
    `🏷 <b>Формат отдыха:</b> ${escapeHtml(truncateText(form.eventType, 80))}\n🏠 <b>Проживание (${escapeHtml(calculation.tariff)}):</b> ${formatPrice(calculation.stayPrice)}`,
  ]
  const serviceSection = services
    ? `🔥 <b>Дополнительные услуги:</b>\n${services}\n\n<b>Стоимость дополнительных услуг:</b> ${formatPrice(calculation.extrasTotal)}`
    : ''
  const dishSection = selectedDishes ? `🍽 <b>Заказ из меню:</b>\n${selectedDishes}` : ''
  const totalSection = `💰 <b>Итого:</b> ${formatPrice(calculation.total)}`
  const commentSection = safeComment ? `💬 <b>Комментарий:</b>\n${safeComment}` : ''
  const receivedSection = `🕐 <b>Получено:</b> ${escapeHtml(formatReceivedAt(receivedAt))}`
  const compose = ({ includeComment = true, includeDishes = true, shortenedServices = false } = {}) => {
    const sections = [...fixedStart]
    if (serviceSection) {
      sections.push(shortenedServices
        ? `🔥 <b>Дополнительные услуги:</b>\n${formatSelectedServices(calculation.extras.slice(0, 3))}\n\n<b>Стоимость дополнительных услуг:</b> ${formatPrice(calculation.extrasTotal)}`
        : serviceSection)
    }
    if (includeDishes && dishSection) sections.push(dishSection)
    sections.push(totalSection)
    if (includeComment && commentSection) sections.push(commentSection)
    sections.push(receivedSection)
    return sections.join('\n\n')
  }

  let message = compose()
  let shortened = false
  if (message.length > TELEGRAM_MESSAGE_LIMIT && commentSection) {
    shortened = true
    message = compose({ includeComment: false })
  }
  if (message.length > TELEGRAM_MESSAGE_LIMIT && dishSection) {
    shortened = true
    message = compose({ includeComment: false, includeDishes: false })
  }
  if (message.length > TELEGRAM_MESSAGE_LIMIT && serviceSection) {
    shortened = true
    message = compose({ includeComment: false, includeDishes: false, shortenedServices: true })
  }
  if (shortened) message = `${message}\n\n<i>Текст сокращён</i>`
  return message
}
