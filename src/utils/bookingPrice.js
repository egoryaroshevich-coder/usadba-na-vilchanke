const dayInMs = 24 * 60 * 60 * 1000

export const toUtcTime = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export const addDays = (value, days) => {
  const time = toUtcTime(value)
  return time === null ? '' : new Date(time + days * dayInMs).toISOString().slice(0, 10)
}

export const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export const formatPrice = (value) => `${value.toLocaleString('ru-RU')} р.`

export function calculateBookingPrice(form, pricing) {
  const checkInTime = toUtcTime(form.checkIn)
  const checkOutTime = toUtcTime(form.checkOut)
  const guests = Number(form.guests)
  const nights = checkInTime !== null && checkOutTime !== null
    ? Math.round((checkOutTime - checkInTime) / dayInMs)
    : 0

  const menuItems = (form.menuCatalog || [])
    .map((item) => {
      const count = Number(form.menuItems?.[item.id] || 0)
      return { ...item, count, total: count * item.price }
    })
    .filter((item) => item.count > 0)
  const menuTotal = menuItems.reduce((sum, item) => sum + item.total, 0)

  if (nights < 1 || guests < 1 || guests > pricing.daily.maxGuests) {
    return { ready: false, nights: 0, total: menuTotal, menuItems, menuTotal, lines: [] }
  }

  const dailyRate = pricing.daily.basePrice
    + Math.max(0, guests - pricing.daily.includedGuests) * pricing.daily.extraGuestPrice
  const packageConfig = pricing.packages[nights]
  const packagePrice = packageConfig?.prices?.[guests]
  const stayPrice = packagePrice ?? dailyRate * nights
  const extras = [
    { label: 'Дополнительная баня', count: Number(form.bathSessions), price: pricing.extras.bathSession },
    { label: 'Дополнительная лодка', count: Number(form.boatDays), price: pricing.extras.boatDay },
    { label: 'Раскладушки с бельём', count: Number(form.foldingBeds), price: pricing.extras.foldingBed },
    { label: 'Дубовые веники', count: Number(form.oakBrooms), price: pricing.extras.oakBroom },
    { label: 'Вёдра дров', count: Number(form.firewoodBuckets), price: pricing.extras.firewoodBucket },
  ]
    .filter((item) => item.count > 0)
    .map((item) => ({ ...item, total: item.count * item.price }))
  const extrasTotal = extras.reduce((sum, item) => sum + item.total, 0)

  return {
    ready: true,
    nights,
    guests,
    dailyRate,
    stayPrice,
    extras,
    extrasTotal,
    menuItems,
    menuTotal,
    total: stayPrice + extrasTotal + menuTotal,
    packageApplied: Boolean(packagePrice),
    packageConfig,
    tariff: packagePrice ? `Мини-отпуск на ${nights} суток` : 'Суточный тариф',
  }
}
