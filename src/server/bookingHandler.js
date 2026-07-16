import { siteData } from '../data/siteData.js'
import {
  buildTelegramMessage,
  getSpamReason,
  validateBookingPayload,
} from '../utils/bookingNotification.js'

export const MAX_BODY_SIZE = 32 * 1024
const TELEGRAM_TIMEOUT_MS = 8000
const CLIENT_ERROR_MESSAGE = 'Не удалось отправить заявку. Попробуйте ещё раз.'

const getHeader = (request, name) => {
  if (typeof request.headers?.get === 'function') return request.headers.get(name)
  const value = request.headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const sendJson = (response, status, body) => {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}

export const hasValidOrigin = (request) => {
  const origin = getHeader(request, 'origin')
  if (!origin) return true
  const forwardedHost = getHeader(request, 'x-forwarded-host')
  const host = String(forwardedHost || getHeader(request, 'host') || '').split(',')[0].trim()
  if (!host) return false

  try {
    const originHostname = new URL(origin).hostname.toLowerCase()
    const hostUrl = new URL(host.includes('://') ? host : `http://${host}`)
    return originHostname === hostUrl.hostname.toLowerCase()
  } catch {
    return false
  }
}

export const readJsonBody = async (request) => {
  const declaredLength = Number(getHeader(request, 'content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_SIZE) throw new Error('payload-too-large')

  if (request.body !== undefined) {
    const raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_SIZE) throw new Error('payload-too-large')
    return typeof request.body === 'string' ? JSON.parse(raw) : request.body
  }

  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_SIZE) throw new Error('payload-too-large')
  }
  return JSON.parse(raw)
}

const safeTelegramError = (telegramData) => ({
  error_code: Number.isFinite(Number(telegramData?.error_code)) ? Number(telegramData.error_code) : null,
  description: typeof telegramData?.description === 'string' ? telegramData.description.slice(0, 300) : 'Unknown Telegram error',
})

export const createBookingHandler = ({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  telegramTimeoutMs = TELEGRAM_TIMEOUT_MS,
} = {}) => async (request, response) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return sendJson(response, 405, { ok: false, message: 'Method Not Allowed' })
  }

  const contentType = String(getHeader(request, 'content-type') || '').toLowerCase()
  if (!contentType.startsWith('application/json')) {
    return sendJson(response, 415, { ok: false, message: CLIENT_ERROR_MESSAGE })
  }

  if (!hasValidOrigin(request)) {
    return sendJson(response, 403, { ok: false, message: CLIENT_ERROR_MESSAGE })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return sendJson(response, 500, { ok: false, message: 'Сервис отправки временно недоступен' })
  }

  let payload
  try {
    payload = await readJsonBody(request)
  } catch (error) {
    const status = error?.message === 'payload-too-large' ? 413 : 400
    return sendJson(response, status, { ok: false, message: CLIENT_ERROR_MESSAGE })
  }

  if (getSpamReason(payload, now())) return sendJson(response, 200, { ok: true })

  const validation = validateBookingPayload(payload, {
    pricing: siteData.booking.pricing,
    eventTypes: siteData.booking.eventTypes,
  })
  if (!validation.ok) return sendJson(response, 400, { ok: false, message: CLIENT_ERROR_MESSAGE })

  const text = buildTelegramMessage({
    ...validation.data,
    receivedAt: new Date(now()),
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), telegramTimeoutMs)

  try {
    const telegramResponse = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    })

    let telegramData = null
    try {
      telegramData = await telegramResponse.json()
    } catch {
      telegramData = null
    }

    if (!telegramResponse.ok || telegramData?.ok !== true) {
      console.error('Telegram API error', safeTelegramError(telegramData))
      return sendJson(response, 502, { ok: false, message: CLIENT_ERROR_MESSAGE })
    }

    return sendJson(response, 200, { ok: true })
  } catch {
    console.error('Telegram request failed')
    return sendJson(response, 502, { ok: false, message: CLIENT_ERROR_MESSAGE })
  } finally {
    clearTimeout(timeout)
  }
}
