import { useEffect } from 'react'
import HomePage from './pages/HomePage.jsx'
import BookingPage from './pages/BookingPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import { siteData } from './data/siteData.js'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    document.title = path === '/booking'
      ? `Бронирование — ${siteData.brand.name}`
      : path === '/admin'
        ? `Административная панель — ${siteData.brand.name}`
        : `${siteData.brand.name} — отдых у воды`
    let scrollFrame
    if (path === '/' && window.location.hash) {
      scrollFrame = window.requestAnimationFrame(() => {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
      })
    } else {
      window.scrollTo(0, 0)
    }

    const items = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'))
      return () => {
        if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )

    items.forEach((item) => observer.observe(item))
    return () => {
      observer.disconnect()
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
    }
  }, [path])

  if (path === '/booking') return <BookingPage />
  if (path === '/admin') return <AdminPage />
  return <HomePage />
}

export default App
