import { useEffect, useState } from 'react'
import { Image, LogOut, MenuSquare, Tags } from 'lucide-react'
import SiteLogo from '../components/SiteLogo.jsx'
import AdminGallerySection from '../components/admin/AdminGallerySection.jsx'
import AdminMenuSection from '../components/admin/AdminMenuSection.jsx'
import AdminPriceSection from '../components/admin/AdminPriceSection.jsx'
import { AdminStatus } from '../components/admin/AdminCommon.jsx'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import '../admin.css'

const sections = [
  { id: 'prices', label: 'Основные цены', icon: Tags },
  { id: 'menu', label: 'Меню блюд', icon: MenuSquare },
  { id: 'gallery', label: 'Галерея', icon: Image },
]

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [signingIn, setSigningIn] = useState(false)
  const [activeSection, setActiveSection] = useState('prices')

  const verifyAdministrator = async (currentSession) => {
    if (!currentSession) return false
    const { data, error } = await supabase.rpc('is_admin')
    if (error) throw error
    if (!data) {
      await supabase.auth.signOut()
      setLoginError('У пользователя нет прав администратора')
      return false
    }
    setSession(currentSession)
    return true
  }

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      if (!isSupabaseConfigured) {
        if (active) {
          setLoginError('Ошибка загрузки: Supabase не настроен. Проверьте переменные окружения.')
          setChecking(false)
        }
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (data.session && active) await verifyAdministrator(data.session)
      } catch (error) {
        if (active) setLoginError(`Ошибка загрузки: ${error.message}`)
      } finally {
        if (active) setChecking(false)
      }
    }
    restoreSession()
    return () => { active = false }
  }, [])

  const signIn = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setLoginError('Ошибка загрузки: Supabase не настроен. Проверьте переменные окружения.')
      return
    }
    setSigningIn(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      })
      if (error) {
        setLoginError('Неверная почта или пароль')
        return
      }
      await verifyAdministrator(data.session)
    } catch (error) {
      setLoginError(`Ошибка загрузки: ${error.message}`)
    } finally {
      setSigningIn(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setCredentials({ email: '', password: '' })
    setLoginError('')
  }

  if (!session) {
    return (
      <main className="admin-login">
        <div className="admin-login__backdrop" aria-hidden="true" />
        <section className="admin-login__card">
          <a className="admin-login__logo" href="/"><SiteLogo /></a>
          <span className="admin-login__eyebrow">Управление сайтом</span>
          <h1>Вход в админку</h1>
          <p>Введите данные администратора, чтобы управлять ценами, меню и галереей.</p>
          {checking ? <AdminStatus>Загрузка…</AdminStatus> : <AdminStatus type="error">{loginError}</AdminStatus>}
          <form className="admin-form admin-login__form" onSubmit={signIn}>
            <label><span>Электронная почта</span><input type="email" autoComplete="email" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label>
            <label><span>Пароль</span><input type="password" autoComplete="current-password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>
            <button className="admin-button admin-button--primary admin-login__submit" type="submit" disabled={checking || signingIn || !isSupabaseConfigured}>{signingIn ? 'Вход…' : 'Войти'}</button>
          </form>
          <a className="admin-login__home" href="/">Вернуться на сайт</a>
        </section>
      </main>
    )
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-sidebar__logo" href="/"><SiteLogo light /></a>
        <div className="admin-sidebar__caption">Административная панель</div>
        <nav aria-label="Разделы административной панели">
          {sections.map(({ id, label, icon: Icon }) => (
            <button className={activeSection === id ? 'is-active' : ''} type="button" onClick={() => setActiveSection(id)} key={id}><Icon size={18} />{label}</button>
          ))}
        </nav>
        <div className="admin-sidebar__account">
          <small>Вы вошли как</small>
          <strong>{session.user.email}</strong>
          <button type="button" onClick={signOut}><LogOut size={17} /> Выйти</button>
        </div>
      </aside>

      <header className="admin-mobile-nav">
        <SiteLogo />
        <div className="admin-mobile-nav__row">
          <select value={activeSection} onChange={(event) => setActiveSection(event.target.value)} aria-label="Раздел административной панели">{sections.map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</select>
          <button type="button" onClick={signOut} aria-label="Выйти"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="admin-main">
        {activeSection === 'prices' && <AdminPriceSection />}
        {activeSection === 'menu' && <AdminMenuSection />}
        {activeSection === 'gallery' && <AdminGallerySection />}
      </main>
    </div>
  )
}
