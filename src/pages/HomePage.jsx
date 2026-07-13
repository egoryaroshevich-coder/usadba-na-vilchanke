import { useCallback, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CarFront,
  Check,
  Clock3,
  Expand,
  Flame,
  House,
  Lamp,
  MapPin,
  PartyPopper,
  Phone,
  Route,
  Sparkles,
  Star,
  Trees,
  UtensilsCrossed,
  Waves,
} from 'lucide-react'
import GalleryModal from '../components/GalleryModal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { siteData } from '../data/siteData.js'

const iconMap = {
  BedDouble,
  CarFront,
  Flame,
  House,
  Lamp,
  PartyPopper,
  Sparkles,
  Trees,
  UtensilsCrossed,
  Waves,
}

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [activeMenu, setActiveMenu] = useState(siteData.menu[0].id)
  const closeGallery = useCallback(() => setSelectedImage(null), [])
  const activeCategory = siteData.menu.find((category) => category.id === activeMenu)
  const switchMenuByKeyboard = (event, currentIndex) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % siteData.menu.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + siteData.menu.length) % siteData.menu.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = siteData.menu.length - 1
    const nextCategory = siteData.menu[nextIndex]
    setActiveMenu(nextCategory.id)
    window.requestAnimationFrame(() => document.getElementById(`menu-tab-${nextCategory.id}`)?.focus())
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" id="home">
          <img className="hero__image" src={siteData.hero.image} alt="Зелёная территория усадьбы На Вильчанке" fetchPriority="high" />
          <div className="hero__overlay" />
          <div className="container hero__content">
            <div className="hero__copy">
              <span className="hero__eyebrow"><Sparkles size={15} /> {siteData.brand.eyebrow}</span>
              <h1>{siteData.hero.title}</h1>
              <p>{siteData.hero.text}</p>
              <div className="hero__actions">
                <a className="button button--primary button--large" href="/booking">
                  Забронировать
                  <ArrowUpRight size={20} />
                </a>
                <a className="button button--glass button--large" href="#prices">
                  Узнать стоимость
                  <ArrowDown size={19} />
                </a>
              </div>
            </div>

            <div className="hero__facts" aria-label="Ключевые характеристики">
              {siteData.hero.facts.map((fact) => (
                <div className="hero__fact" key={fact.label}>
                  <strong>{fact.value}</strong>
                  <span>{fact.label}</span>
                </div>
              ))}
            </div>
          </div>
          <a className="hero__scroll" href="#about" aria-label="Перейти к разделу об усадьбе">
            <span>Листайте</span>
            <ArrowDown size={17} />
          </a>
        </section>

        <section className="section about" id="about">
          <div className="container">
            <div className="about__intro reveal">
              <SectionHeading eyebrow="Об усадьбе" title={siteData.about.title} />
              <div className="about__text">
                {siteData.about.text.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>

            <div className="about__body reveal">
              <div className="about__photo-wrap">
                <img className="about__photo" src={siteData.about.image} alt="Главный дом усадьбы в окружении зелени" loading="lazy" />
                <div className="about__photo-note">
                  <span className="about__photo-note-icon"><Trees size={22} /></span>
                  <span><strong>Первая береговая линия</strong>Пирс, лодка и водные прогулки</span>
                </div>
              </div>
              <div className="advantages">
                {siteData.about.advantages.map((item, index) => {
                  const Icon = iconMap[item.icon]
                  return (
                    <article className="advantage-card" key={item.title}>
                      <span className="advantage-card__number">0{index + 1}</span>
                      <span className="advantage-card__icon"><Icon size={23} /></span>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="stay-details reveal">
              <div className="stay-details__head">
                <span className="eyebrow">Условия проживания</span>
                <h3>{siteData.accommodation.title}</h3>
                <p>{siteData.accommodation.text}</p>
              </div>
              <div className="stay-details__grid">
                {siteData.accommodation.sections.map((section) => {
                  const Icon = iconMap[section.icon]
                  return (
                    <article className="stay-detail-card" key={section.title}>
                      <span className="stay-detail-card__icon"><Icon size={23} /></span>
                      <h4>{section.title}</h4>
                      <ul>
                        {section.items.map((item) => <li key={item}><Check size={15} /> <span>{item}</span></li>)}
                      </ul>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="section section--cream gallery-section" id="gallery">
          <div className="container">
            <div className="gallery-section__head reveal">
              <SectionHeading
                eyebrow="Фотографии"
                title="Посмотрите, как здесь на самом деле"
                text="Здесь собраны реальные кадры дома, территории, номеров и отдыха у воды."
              />
              <div className="gallery-section__hint"><Expand size={18} /> Нажмите, чтобы увеличить</div>
            </div>

            <div className="gallery-grid reveal">
              {siteData.gallery.map((image, index) => (
                <button
                  className={`gallery-card gallery-card--${index + 1}`}
                  type="button"
                  key={image.title}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Увеличить фотографию: ${image.title}`}
                >
                  <img src={image.src} alt={image.alt} loading="lazy" />
                  <span className="gallery-card__shade" />
                  <span className="gallery-card__title">{image.title}</span>
                  <span className="gallery-card__expand"><Expand size={18} /></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section prices" id="prices">
          <div className="container">
            <div className="prices__head reveal">
              <SectionHeading
                eyebrow="Цены и услуги"
                title="Выберите свой формат отдыха"
                text="Сутки в усадьбе, готовые пакеты на 3 и 5 дней, баня и дополнительные услуги."
              />
            </div>
            <div className="price-grid reveal">
              {siteData.prices.map((item) => {
                const Icon = iconMap[item.icon]
                return (
                  <article className={`price-card ${item.featured ? 'price-card--featured' : ''}`} key={item.title}>
                    {item.badge && <span className="price-card__badge">{item.badge}</span>}
                    <span className="price-card__icon"><Icon size={25} /></span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {item.details && (
                      <ul className="price-card__details">
                        {item.details.map((detail) => <li key={detail}>{detail}</li>)}
                      </ul>
                    )}
                    <div className="price-card__cost">
                      <strong>{item.price}</strong>
                      <span>{item.unit}</span>
                    </div>
                    <a className="price-card__link" href={`/booking?service=${encodeURIComponent(item.title)}`}>
                      Уточнить дату <ArrowRight size={18} />
                    </a>
                  </article>
                )
              })}
            </div>
            <div className="price-disclaimer reveal">
              <Check size={19} />
              <span>Актуальность обязательно уточняйте при бронировании.</span>
              <a href={siteData.contacts.phoneHref}>{siteData.contacts.phone}</a>
            </div>
            <div className="conditions-grid reveal">
              {siteData.conditions.map((condition, index) => (
                <article className={`condition-card condition-card--${index + 1}`} key={condition.title}>
                  <span className="condition-card__number">0{index + 1}</span>
                  <h3>{condition.title}</h3>
                  <ul>
                    {condition.items.map((item) => <li key={item}><Check size={15} /><span>{item}</span></li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--green menu-section" id="menu">
          <div className="container">
            <div className="menu-section__head reveal">
              <SectionHeading
                eyebrow="Питание"
                title="Полное меню для отдыха и праздников"
                text="Салаты, горячие блюда, закуски, канапе и рулеты. Заказ и количество порций согласуйте заранее."
              />
              <span className="menu-section__deco" aria-hidden="true">меню</span>
            </div>

            <div className="menu-tabs reveal" role="tablist" aria-label="Категории меню">
              {siteData.menu.map((category, index) => (
                <button
                  id={`menu-tab-${category.id}`}
                  className={activeMenu === category.id ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-controls="menu-panel"
                  aria-selected={activeMenu === category.id}
                  tabIndex={activeMenu === category.id ? 0 : -1}
                  key={category.id}
                  onClick={() => setActiveMenu(category.id)}
                  onKeyDown={(event) => switchMenuByKeyboard(event, index)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div id="menu-panel" className="menu-card reveal" role="tabpanel" aria-labelledby={`menu-tab-${activeMenu}`}>
              <div className="menu-card__title">
                <span>Категория</span>
                <h3>{activeCategory.label}</h3>
              </div>
              <div className="menu-list">
                {activeCategory.items.map((item) => (
                  <article className="menu-item" key={item.name}>
                    <div className="menu-item__main">
                      <h4>{item.name}</h4>
                      <span className="menu-item__line" />
                      <strong>{item.price}</strong>
                    </div>
                    <div className="menu-item__meta">
                      <p>{item.description}</p>
                      <span>{item.weight}</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="menu-card__footer">
                <div>
                  <UtensilsCrossed size={23} />
                  <span><strong>Предварительный заказ</strong>{siteData.menuUpdated}</span>
                </div>
                <a className="button button--dark" href="/booking">Обсудить меню <ArrowUpRight size={18} /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="section reviews" id="reviews">
          <div className="container">
            <div className="reviews__head reveal">
              <SectionHeading
                eyebrow="Отзывы"
                title="Рейтинг 5,0 на Яндекс Картах"
                text={`У усадьбы ${siteData.rating.ratings} и ${siteData.rating.reviews}. Гости особенно отмечают хозяина, атмосферу, баню, территорию и вид.`}
              />
              <a className="reviews__rating" href={siteData.rating.href} target="_blank" rel="noreferrer" aria-label="Открыть отзывы в Яндекс Картах">
                <strong>{siteData.rating.value}</strong>
                <span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill="currentColor" />)}</span>
                <small>{siteData.rating.ratings} в Яндекс Картах</small>
              </a>
            </div>
            <div className="review-grid reveal">
              {siteData.reviews.map((review, index) => (
                <article className="review-card" key={review.name}>
                  <span className="review-card__quote">“</span>
                  <div className="review-card__stars" aria-label={`Оценка ${review.rating} из 5`}>
                    {Array.from({ length: review.rating }, (_, star) => <Star key={star} size={15} fill="currentColor" />)}
                  </div>
                  <p>{review.text}</p>
                  <div className="review-card__author">
                    <span className={`review-card__avatar review-card__avatar--${index + 1}`}>{review.initials}</span>
                    <span><strong>{review.name}</strong><small>{review.date}</small></span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--cream location" id="location">
          <div className="container location__grid">
            <div className="location__content reveal">
              <SectionHeading
                eyebrow="Расположение"
                title="Достаточно близко, чтобы приехать. Достаточно далеко, чтобы отдохнуть."
              />
              <div className="location__details">
                <div><MapPin size={21} /><span><small>Адрес</small><strong>{siteData.contacts.address}</strong></span></div>
                <div><Route size={21} /><span><small>Расстояние</small><strong>{siteData.contacts.distance}</strong></span></div>
                <div><Clock3 size={21} /><span><small>Мы на связи</small><strong>{siteData.contacts.schedule}</strong></span></div>
              </div>
              <p className="location__text">Усадьба находится в 8 км от Могилёва. Ближайшая остановка — «Вильчицы-2», примерно в 830 метрах. Координаты: {siteData.contacts.coordinates}.</p>
              <div className="location__actions">
                <a className="button button--dark" href={siteData.contacts.routeHref} target="_blank" rel="noreferrer">
                  Построить маршрут <ArrowUpRight size={18} />
                </a>
              </div>
              <a className="location__phone" href={siteData.contacts.phoneHref}><Phone size={17} /> {siteData.contacts.phone}</a>
            </div>

            <div className="map-embed reveal">
              <iframe
                src={siteData.contacts.mapEmbed}
                title={`Карта: ${siteData.brand.name}`}
                loading="lazy"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        <section className="booking-cta">
          <div className="booking-cta__pattern" aria-hidden="true" />
          <div className="container booking-cta__inner reveal">
            <span className="booking-cta__icon"><Sparkles size={23} /></span>
            <div>
              <span className="eyebrow">Планируете отдых?</span>
              <h2>Узнайте, свободна ли ваша дата</h2>
              <p>Оставьте заявку — администратор свяжется с вами и ответит на вопросы.</p>
            </div>
            <a className="button button--primary button--large" href="/booking">
              Забронировать усадьбу <ArrowUpRight size={20} />
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
      {selectedImage !== null && (
        <GalleryModal
          images={siteData.gallery}
          selectedIndex={selectedImage}
          onClose={closeGallery}
          onChange={setSelectedImage}
        />
      )}
    </>
  )
}
