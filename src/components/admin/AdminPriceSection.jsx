import { useCallback, useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { fetchPriceCards, supportedPriceIcons } from '../../lib/content.js'
import { supabase } from '../../lib/supabase.js'
import { AdminEmpty, AdminModal, AdminStatus } from './AdminCommon.jsx'

const emptyForm = {
  title: '',
  description: '',
  price: '',
  unit: '',
  details: [''],
  icon: 'House',
  featured: false,
  badge: '',
}

export default function AdminPriceSection() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveState, setSaveState] = useState({ type: '', message: '' })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setRows(await fetchPriceCards())
    } catch (error) {
      setLoadError(`Ошибка загрузки: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRows() }, [loadRows])

  const openCreate = () => {
    setEditing({ mode: 'create' })
    setForm(emptyForm)
    setSaveState({ type: '', message: '' })
  }

  const openEdit = (row) => {
    setEditing({ mode: 'edit', row })
    setForm({
      title: row.title || '',
      description: row.description || '',
      price: row.price || '',
      unit: row.unit || '',
      details: Array.isArray(row.details) && row.details.length ? row.details : [''],
      icon: row.icon || 'House',
      featured: Boolean(row.featured),
      badge: row.badge || '',
    })
    setSaveState({ type: '', message: '' })
  }

  const updateDetail = (index, value) => {
    setForm((current) => ({
      ...current,
      details: current.details.map((detail, detailIndex) => detailIndex === index ? value : detail),
    }))
  }

  const removeDetail = (index) => {
    setForm((current) => ({
      ...current,
      details: current.details.length === 1 ? [''] : current.details.filter((_, detailIndex) => detailIndex !== index),
    }))
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSaveState({ type: 'info', message: 'Сохранение…' })
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: form.price.trim(),
      unit: form.unit.trim(),
      details: form.details.map((detail) => detail.trim()).filter(Boolean),
      icon: form.icon,
      featured: form.featured,
      badge: form.badge.trim() || null,
    }

    try {
      if (editing.mode === 'create') {
        payload.sort_order = rows.reduce((maximum, row) => Math.max(maximum, Number(row.sort_order) || 0), 0) + 1
        const { data, error } = await supabase.from('price_cards').insert(payload).select().single()
        if (error) throw error
        setRows((current) => [...current, data])
      } else {
        payload.updated_at = new Date().toISOString()
        const { data, error } = await supabase.from('price_cards').update(payload).eq('id', editing.row.id).select().single()
        if (error) throw error
        setRows((current) => current.map((row) => row.id === data.id ? data : row))
      }
      setEditing(null)
      setSaveState({ type: 'success', message: 'Успешно сохранено' })
    } catch (error) {
      setSaveState({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm(`Удалить карточку «${row.title}»?`)) return
    setSaveState({ type: 'info', message: 'Сохранение…' })
    const { error } = await supabase.from('price_cards').delete().eq('id', row.id)
    if (error) {
      setSaveState({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
      return
    }
    setRows((current) => current.filter((item) => item.id !== row.id))
    setSaveState({ type: 'success', message: 'Успешно сохранено' })
  }

  return (
    <section className="admin-section">
      <div className="admin-section__head">
        <div><span>Контент сайта</span><h1>Основные цены</h1><p>Карточки выводятся на главной странице в указанном порядке.</p></div>
        <button className="admin-button admin-button--primary" type="button" onClick={openCreate}><Plus size={17} /> Добавить</button>
      </div>

      <AdminStatus type={loadError ? 'error' : saveState.type}>{loadError || saveState.message}</AdminStatus>
      {loading && <AdminStatus>Загрузка…</AdminStatus>}
      {!loading && rows.length === 0 && !loadError && <AdminEmpty>Ценовые карточки пока не добавлены.</AdminEmpty>}

      <div className="admin-card-grid">
        {rows.map((row) => (
          <article className={`admin-content-card ${row.featured ? 'is-featured' : ''}`} key={row.id}>
            <div className="admin-content-card__top">
              <span className="admin-chip">{row.icon || 'Sparkles'}</span>
              {row.badge && <span className="admin-chip admin-chip--accent">{row.badge}</span>}
            </div>
            <h2>{row.title}</h2>
            <p>{row.description}</p>
            <strong>{row.price} <small>{row.unit}</small></strong>
            {Array.isArray(row.details) && row.details.length > 0 && <ul>{row.details.map((detail) => <li key={detail}><Check size={13} />{detail}</li>)}</ul>}
            <div className="admin-content-card__actions">
              <button type="button" onClick={() => openEdit(row)}><Pencil size={15} /> Редактировать</button>
              <button className="is-danger" type="button" onClick={() => remove(row)}><Trash2 size={15} /> Удалить</button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <AdminModal title={editing.mode === 'create' ? 'Новая ценовая карточка' : 'Редактирование карточки'} onClose={() => setEditing(null)}>
          <form className="admin-form" onSubmit={save}>
            <label><span>Название</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>Описание</span><textarea required rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="admin-form__grid">
              <label><span>Цена</span><input required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="400 р." /></label>
              <label><span>Единица</span><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="за 1 сутки" /></label>
            </div>
            <div className="admin-form__details">
              <div className="admin-form__label-row"><span>Дополнительные строки</span><button type="button" onClick={() => setForm((current) => ({ ...current, details: [...current.details, ''] }))}><Plus size={14} /> Добавить строку</button></div>
              {form.details.map((detail, index) => (
                <div className="admin-form__detail" key={index}>
                  <input value={detail} onChange={(event) => updateDetail(index, event.target.value)} placeholder="Дополнительная информация" />
                  <button type="button" onClick={() => removeDetail(index)} aria-label="Удалить строку"><X size={16} /></button>
                </div>
              ))}
            </div>
            <div className="admin-form__grid">
              <label><span>Иконка</span><select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>{supportedPriceIcons.map((icon) => <option key={icon}>{icon}</option>)}</select></label>
              <label><span>Текст бейджа</span><input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} /></label>
            </div>
            <label className="admin-check"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /><span>Выделенная карточка</span></label>
            <AdminStatus type={saveState.type}>{editing && saveState.message}</AdminStatus>
            <div className="admin-form__actions"><button type="button" onClick={() => setEditing(null)}>Отмена</button><button className="admin-button--primary" type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div>
          </form>
        </AdminModal>
      )}
    </section>
  )
}
