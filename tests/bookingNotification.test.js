import assert from 'node:assert/strict'
import test from 'node:test'
import { siteData } from '../src/data/siteData.js'
import { createBookingHandler, MAX_BODY_SIZE } from '../src/server/bookingHandler.js'
import {
  buildTelegramMessage,
  createBookingPayload,
  escapeHtml,
  formatSelectedDishes,
  getSpamReason,
  TELEGRAM_MESSAGE_LIMIT,
  validateBookingPayload,
} from '../src/utils/bookingNotification.js'
import { calculateBookingPrice } from '../src/utils/bookingPrice.js'

const NOW = 1784160000000

const validForm = {
  name: 'Тестовый гость',
  phone: '+375 29 000-00-00',
  checkIn: '2026-08-10',
  checkOut: '2026-08-13',
  guests: '4',
  childrenNoBed: '1',
  eventType: 'Мини-отпуск на 3 суток',
  bathSessions: '1',
  boatDays: '0',
  foldingBeds: '1',
  oakBrooms: '2',
  firewoodBuckets: '0',
  comment: 'Нужна тихая комната.',
  consent: true,
  website: '',
}

const makePayload = (overrides = {}) => {
  const form = { ...validForm, ...overrides }
  const calculation = calculateBookingPrice(form, siteData.booking.pricing)
  return createBookingPayload(form, calculation, NOW - 5000)
}

const createResponse = () => ({
  statusCode: 0,
  body: null,
  headers: {},
  setHeader(name, value) { this.headers[name] = value },
  status(value) { this.statusCode = value; return this },
  json(value) { this.body = value; return this },
})

const invoke = async (handler, {
  method = 'POST',
  body = makePayload(),
  headers = { 'content-type': 'application/json', origin: 'https://preview.example.com', host: 'preview.example.com' },
} = {}) => {
  const response = createResponse()
  await handler({ method, body, headers }, response)
  return response
}

const setTelegramEnvironment = () => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token-not-a-secret'
  process.env.TELEGRAM_CHAT_ID = '123456'
}

test('escapeHtml экранирует пользовательский HTML', () => {
  assert.equal(escapeHtml('<b title="x">A & B</b>'), '&lt;b title=&quot;x&quot;&gt;A &amp; B&lt;/b&gt;')
})

test('валидатор принимает корректный payload, игнорируя неизвестные поля', () => {
  const payload = { ...makePayload(), unknownField: 'ignored' }
  const result = validateBookingPayload(payload, siteData.booking)
  assert.equal(result.ok, true)
  assert.equal(result.data.calculation.total, 835)
})

test('валидатор отклоняет неверные даты и подменённую сумму', () => {
  const invalidDate = makePayload({ checkOut: '2026-08-09' })
  assert.equal(validateBookingPayload(invalidDate, siteData.booking).ok, false)

  const tampered = makePayload()
  tampered.calculation.total += 1
  assert.equal(validateBookingPayload(tampered, siteData.booking).ok, false)
})

test('honeypot и слишком быстрая отправка распознаются как спам', () => {
  assert.equal(getSpamReason({ ...makePayload(), website: 'spam.example' }, NOW), 'honeypot')
  assert.equal(getSpamReason({ ...makePayload(), formStartedAt: NOW - 100 }, NOW), 'too-fast')
})

test('Telegram-сообщение безопасно, читаемо и не превышает лимит', () => {
  const payload = makePayload({ name: '<Admin & "Guest">', comment: '<script>alert(1)</script>' })
  const validation = validateBookingPayload(payload, siteData.booking)
  const message = buildTelegramMessage({ ...validation.data, receivedAt: new Date(NOW) })
  assert.match(message, /&lt;Admin &amp; &quot;Guest&quot;&gt;/)
  assert.doesNotMatch(message, /<script>/)
  assert.match(message, /Дополнительные услуги/)
  assert.match(message, /835 р\./)
  assert.ok(message.length <= TELEGRAM_MESSAGE_LIMIT)
  assert.match(formatSelectedDishes([{ name: 'Блюдо & соус', count: 2, total: 29 }]), /Блюдо &amp; соус × 2 — 29 р\./)

  const longMessage = buildTelegramMessage({
    ...validation.data,
    receivedAt: new Date(NOW),
    dishes: Array.from({ length: 30 }, (_, index) => ({ name: `Очень длинное название блюда ${index} `.repeat(4), count: 20, total: 9999 })),
  })
  assert.ok(longMessage.length <= TELEGRAM_MESSAGE_LIMIT)
  assert.match(longMessage, /Текст сокращён/)
})

test('API принимает только POST', async () => {
  const response = await invoke(createBookingHandler(), { method: 'GET' })
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.Allow, 'POST')
})

test('API возвращает 500 без серверных переменных', async () => {
  delete process.env.TELEGRAM_BOT_TOKEN
  delete process.env.TELEGRAM_CHAT_ID
  const response = await invoke(createBookingHandler())
  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.body, { ok: false, message: 'Сервис отправки временно недоступен' })
})

test('API отклоняет неверный Content-Type, Origin и слишком большое тело', async () => {
  setTelegramEnvironment()
  const handler = createBookingHandler()
  assert.equal((await invoke(handler, { headers: { 'content-type': 'text/plain', host: 'preview.example.com' } })).statusCode, 415)
  assert.equal((await invoke(handler, { headers: { 'content-type': 'application/json', origin: 'https://evil.example.com', host: 'preview.example.com' } })).statusCode, 403)
  assert.equal((await invoke(handler, { headers: { 'content-type': 'application/json', host: 'preview.example.com', 'content-length': String(MAX_BODY_SIZE + 1) } })).statusCode, 413)
})

test('успешная отправка вызывает Telegram только на сервере', async () => {
  setTelegramEnvironment()
  let requestBody
  const handler = createBookingHandler({
    now: () => NOW,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.telegram.org/bottest-token-not-a-secret/sendMessage')
      requestBody = JSON.parse(options.body)
      return { ok: true, json: async () => ({ ok: true }) }
    },
  })
  const response = await invoke(handler)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { ok: true })
  assert.equal(requestBody.chat_id, '123456')
  assert.equal(requestBody.parse_mode, 'HTML')
  assert.equal(requestBody.disable_web_page_preview, true)
})

test('ошибка Telegram возвращается клиенту как нейтральная 502', async () => {
  setTelegramEnvironment()
  const originalError = console.error
  console.error = () => {}
  try {
    const handler = createBookingHandler({
      now: () => NOW,
      fetchImpl: async () => ({ ok: false, json: async () => ({ ok: false, error_code: 400, description: 'Bad Request' }) }),
    })
    const response = await invoke(handler)
    assert.equal(response.statusCode, 502)
    assert.equal(response.body.ok, false)
    assert.equal(response.body.message, 'Не удалось отправить заявку. Попробуйте ещё раз.')
  } finally {
    console.error = originalError
  }
})

test('honeypot и быстрая отправка не вызывают Telegram', async () => {
  setTelegramEnvironment()
  let calls = 0
  const handler = createBookingHandler({ now: () => NOW, fetchImpl: async () => { calls += 1 } })
  const honeypot = await invoke(handler, { body: { ...makePayload(), website: 'bot' } })
  const tooFast = await invoke(handler, { body: { ...makePayload(), formStartedAt: NOW - 100 } })
  assert.equal(honeypot.statusCode, 200)
  assert.equal(tooFast.statusCode, 200)
  assert.equal(calls, 0)
})

test('невалидные данные не вызывают Telegram', async () => {
  setTelegramEnvironment()
  let calls = 0
  const handler = createBookingHandler({ now: () => NOW, fetchImpl: async () => { calls += 1 } })
  const response = await invoke(handler, { body: { ...makePayload(), guests: '0' } })
  assert.equal(response.statusCode, 400)
  assert.equal(calls, 0)
})

test('тайм-аут Telegram завершается нейтральной ошибкой', async () => {
  setTelegramEnvironment()
  const originalError = console.error
  console.error = () => {}
  try {
    const handler = createBookingHandler({
      now: () => NOW,
      telegramTimeoutMs: 5,
      fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      }),
    })
    const response = await invoke(handler)
    assert.equal(response.statusCode, 502)
  } finally {
    console.error = originalError
  }
})
