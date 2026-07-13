import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Info,
  LockKeyhole,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react'
import SiteLogo from '../components/SiteLogo.jsx'
import { siteData } from '../data/siteData.js'
import { addDays, calculateBookingPrice, formatDate, formatPrice } from '../utils/bookingPrice.js'

const initialForm = {
  name: '',
  phone: '',
  checkIn: '',
  checkOut: '',
  guests: '',
  childrenNoBed: '0',
  eventType: '',
  bathSessions: '0',
  boatDays: '0',
  foldingBeds: '0',
  oakBrooms: '0',
  firewoodBuckets: '0',
  comment: '',
  consent: false,
}

export default function BookingPage() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const pricing = siteData.booking.pricing

  const today = new Date()
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  const minCheckOut = form.checkIn ? addDays(form.checkIn, 1) : addDays(minDate, 1)

  const calculation = useMemo(() => calculateBookingPrice(form, pricing), [form, pricing])

  const updateField = (event) => {
    const { name, type, value, checked } = event.target
    setForm((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value }
      if (name === 'checkIn' && current.checkOut && current.checkOut <= value) next.checkOut = ''
      return next
    })
  }

  const submitForm = (event) => {
    event.preventDefault()
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setForm(initialForm)
    setSubmitted(false)
  }

  return (
    <div className="booking-page">
      <header className="booking-header">
        <div className="container booking-header__inner">
          <a href="/"><SiteLogo /></a>
          <a className="booking-header__back" href="/"><ArrowLeft size={18} /> Вернуться на главную</a>
        </div>
      </header>

      <main className="booking-main">
        <div className="booking-main__wash" aria-hidden="true" />
        <div className="container booking-main__head">
          <span className="eyebrow"><Sparkles size={15} /> Бронирование</span>
          <h1>{submitted ? 'Спасибо! Заявка отправлена' : 'Давайте спланируем ваш отдых'}</h1>
          <p>
            {submitted
              ? 'Мы получили данные заявки и свяжемся с вами, чтобы уточнить детали.'
              : 'Заполните короткую форму. Это займёт около двух минут.'}
          </p>
        </div>

        <div className="container booking-layout">
          {submitted ? (
            <section className="success-card" aria-live="polite">
              <span className="success-card__icon"><CheckCircle2 size={42} /></span>
              <div className="success-card__content">
                <span className="eyebrow">Заявка принята</span>
                <h2>{form.name}, скоро мы вам позвоним</h2>
                <p>Администратор свяжется по номеру <strong>{form.phone}</strong>, проверит выбранные даты и ответит на вопросы.</p>
                <div className="success-card__summary">
                  <div><CalendarDays size={20} /><span><small>Период</small><strong>{formatDate(form.checkIn)} — {formatDate(form.checkOut)}</strong></span></div>
                  <div><Users size={20} /><span><small>Гости</small><strong>{form.guests} + {form.childrenNoBed} без места</strong></span></div>
                  <div><Calculator size={20} /><span><small>Предварительно</small><strong>{formatPrice(calculation.total)}</strong></span></div>
                </div>
                <div className="form-notice form-notice--success">
                  <Info size={19} />
                  <span>Отправка заявки не подтверждает бронирование. Дата будет закреплена после звонка администратора и согласования условий.</span>
                </div>
                <div className="success-card__actions">
                  <a className="button button--dark" href="/">На главную <ArrowRight size={18} /></a>
                  <button className="button button--outline" type="button" onClick={resetForm}>Отправить ещё одну</button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <form className="booking-form" onSubmit={submitForm}>
                <div className="booking-form__section">
                  <div className="booking-form__section-head">
                    <span>01</span>
                    <div><h2>Как с вами связаться</h2><p>Оставьте удобные контактные данные.</p></div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Ваше имя <em>*</em></span>
                      <input name="name" type="text" value={form.name} onChange={updateField} placeholder="Например, Анна" autoComplete="name" required />
                    </label>
                    <label className="field">
                      <span>Номер телефона <em>*</em></span>
                      <input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="+375 (__) ___-__-__" autoComplete="tel" required />
                    </label>
                  </div>
                </div>

                <div className="booking-form__section">
                  <div className="booking-form__section-head">
                    <span>02</span>
                    <div><h2>Расскажите о планах</h2><p>Данные помогут подготовить предложение.</p></div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Дата заезда <em>*</em></span>
                      <input name="checkIn" type="date" min={minDate} value={form.checkIn} onChange={updateField} required />
                    </label>
                    <label className="field">
                      <span>Дата выезда <em>*</em></span>
                      <input name="checkOut" type="date" min={minCheckOut} value={form.checkOut} onChange={updateField} disabled={!form.checkIn} required />
                    </label>
                    <label className="field">
                      <span>Гостей со спальным местом <em>*</em></span>
                      <input name="guests" type="number" min="1" max="20" value={form.guests} onChange={updateField} placeholder="Например, 8" required />
                    </label>
                    <label className="field">
                      <span>Детей без отдельного места</span>
                      <input name="childrenNoBed" type="number" min="0" max="20" value={form.childrenNoBed} onChange={updateField} />
                    </label>
                    <label className="field">
                      <span>Формат отдыха <em>*</em></span>
                      <select name="eventType" value={form.eventType} onChange={updateField} required>
                        <option value="" disabled>Выберите вариант</option>
                        {siteData.booking.eventTypes.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="booking-form__section">
                  <div className="booking-form__section-head">
                    <span>03</span>
                    <div><h2>Дополнительные услуги</h2><p>Укажите количество сверх того, что уже входит в пакет.</p></div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Дополнительные сеансы бани</span>
                      <input name="bathSessions" type="number" min="0" max="10" value={form.bathSessions} onChange={updateField} />
                    </label>
                    <label className="field">
                      <span>Дополнительные дни лодки</span>
                      <input name="boatDays" type="number" min="0" max="30" value={form.boatDays} onChange={updateField} />
                    </label>
                    <label className="field">
                      <span>Раскладушки с бельём</span>
                      <input name="foldingBeds" type="number" min="0" max="3" value={form.foldingBeds} onChange={updateField} />
                    </label>
                    <label className="field">
                      <span>Дубовые веники</span>
                      <input name="oakBrooms" type="number" min="0" max="20" value={form.oakBrooms} onChange={updateField} />
                    </label>
                    <label className="field">
                      <span>Дополнительные вёдра дров</span>
                      <input name="firewoodBuckets" type="number" min="0" max="20" value={form.firewoodBuckets} onChange={updateField} />
                    </label>
                    <div className="form-notice form-notice--menu field--full">
                      <Info size={18} />
                      <span>Меню и количество блюд согласуются с владельцем после отправки заявки.</span>
                    </div>
                    <label className="field field--full">
                      <span>Комментарий</span>
                      <textarea name="comment" value={form.comment} onChange={updateField} maxLength="500" rows="5" placeholder="Расскажите, что для вас важно: нужна ли баня, проживание или есть особые пожелания" />
                      <small>{form.comment.length} / 500</small>
                    </label>
                  </div>
                </div>

                <div className="booking-form__submit">
                  <label className="check-field">
                    <input name="consent" type="checkbox" checked={form.consent} onChange={updateField} required />
                    <span className="check-field__box"><Check size={15} /></span>
                    <span>Я согласен(а) на обработку персональных данных <em>*</em></span>
                  </label>
                  <button className="button button--primary button--large" type="submit">
                    Отправить заявку <ArrowRight size={19} />
                  </button>
                  <div className="form-notice">
                    <Info size={18} />
                    <span>Заявка не является окончательным подтверждением бронирования. Администратор свяжется с вами для уточнения деталей.</span>
                  </div>
                </div>
              </form>

              <aside className="booking-aside">
                <output className="booking-aside__card booking-estimate" aria-live="polite">
                  <span className="booking-aside__icon"><Calculator size={24} /></span>
                  <span className="booking-estimate__eyebrow">Расчёт</span>
                  <h2>Предварительная стоимость</h2>
                  {calculation.ready ? (
                    <>
                      <span className="booking-estimate__tariff">{calculation.tariff}</span>
                      <div className="booking-estimate__rows">
                        <div>
                          <span>Проживание · {calculation.nights} {calculation.nights === 1 ? 'сутки' : 'суток'}</span>
                          <strong>{formatPrice(calculation.stayPrice)}</strong>
                        </div>
                        {calculation.packageApplied && (
                          <p>Включено: баня {calculation.packageConfig.includedBathSessions} {calculation.packageConfig.includedBathSessions === 1 ? 'раз' : 'раза'} и лодка.</p>
                        )}
                        {calculation.extras.map((item) => (
                          <div key={item.label}>
                            <span>{item.label} · {item.count}</span>
                            <strong>{formatPrice(item.total)}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="booking-estimate__total">
                        <span>Итого</span>
                        <strong>{formatPrice(calculation.total)}</strong>
                      </div>
                    </>
                  ) : (
                    <p>Укажите даты заезда и выезда, а также количество гостей — расчёт появится автоматически.</p>
                  )}
                  <small>Предварительный расчёт. Актуальность стоимости уточнит администратор.</small>
                </output>
                <div className="booking-aside__contact">
                  <span>Удобнее позвонить?</span>
                  <a href={siteData.contacts.phoneHref}><Phone size={18} /> {siteData.contacts.phone}</a>
                  <small><Clock3 size={14} /> {siteData.contacts.schedule}</small>
                </div>
                <div className="booking-aside__safe"><LockKeyhole size={18} /><span>Контактные данные используются только для связи по вашей заявке.</span></div>
              </aside>
            </>
          )}
        </div>
      </main>

      <footer className="booking-footer">
        <div className="container">
          <span>© {new Date().getFullYear()} {siteData.brand.name}</span>
          <span>{siteData.contacts.address}</span>
        </div>
      </footer>
    </div>
  )
}
