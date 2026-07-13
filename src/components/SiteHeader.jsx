import { useEffect, useState } from 'react'
import { ArrowUpRight, Menu, Phone, X } from 'lucide-react'
import SiteLogo from './SiteLogo.jsx'
import { siteData } from '../data/siteData.js'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-open', open)
    return () => document.body.classList.remove('menu-open')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
      <div className="container site-header__inner">
        <a className="site-header__logo" href="#home" onClick={() => setOpen(false)}>
          <SiteLogo />
        </a>

        <nav className={`site-nav ${open ? 'site-nav--open' : ''}`} aria-label="Основная навигация">
          <div className="site-nav__mobile-head">
            <SiteLogo />
            <button className="icon-button" type="button" aria-label="Закрыть меню" onClick={() => setOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="site-nav__links">
            {siteData.navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>
          <a className="site-nav__phone" href={siteData.contacts.phoneHref} onClick={() => setOpen(false)}>
            <Phone size={17} />
            <span>{siteData.contacts.phone}</span>
          </a>
          <a className="button button--primary site-nav__booking" href="/booking" onClick={() => setOpen(false)}>
            Забронировать
            <ArrowUpRight size={18} />
          </a>
        </nav>

        <div className={`site-nav__backdrop ${open ? 'is-visible' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
        <button
          className="icon-button site-header__menu"
          type="button"
          aria-label="Открыть меню"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={25} />
        </button>
      </div>
    </header>
  )
}
