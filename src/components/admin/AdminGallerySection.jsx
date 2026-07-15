import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { fetchGalleryImages } from '../../lib/content.js'
import { supabase } from '../../lib/supabase.js'
import { AdminEmpty, AdminModal, AdminStatus } from './AdminCommon.jsx'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const emptyForm = { title: '', alt_text: '', file: null }

const validateFile = (file) => {
  if (!file) return ''
  if (!ALLOWED_TYPES.has(file.type)) return 'Допустимы только изображения JPEG, PNG и WebP.'
  if (file.size > MAX_FILE_SIZE) return 'Размер изображения не должен превышать 10 МБ.'
  return ''
}

const extensionFor = (file) => {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

const uploadImage = async (file) => {
  const storagePath = `${crypto.randomUUID()}.${extensionFor(file)}`
  const { error } = await supabase.storage.from('gallery').upload(storagePath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('gallery').getPublicUrl(storagePath)
  return { storagePath, imageUrl: data.publicUrl }
}

export default function AdminGallerySection() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setRows(await fetchGalleryImages())
    } catch (error) {
      setLoadError(`Ошибка загрузки: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setDialog({ mode: 'create' })
    setForm(emptyForm)
    setStatus({ type: '', message: '' })
  }

  const openEdit = (row) => {
    setDialog({ mode: 'edit', row })
    setForm({ title: row.title || '', alt_text: row.alt_text || '', file: null })
    setStatus({ type: '', message: '' })
  }

  const closeDialog = () => {
    if (saving) return
    setDialog(null)
  }

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null
    const fileError = validateFile(file)
    if (fileError) {
      setForm((current) => ({ ...current, file: null }))
      setStatus({ type: 'error', message: `Ошибка сохранения: ${fileError}` })
      event.target.value = ''
      return
    }
    setForm((current) => ({ ...current, file }))
    setStatus({ type: '', message: '' })
  }

  const save = async (event) => {
    event.preventDefault()
    if (dialog.mode === 'create' && !form.file) {
      setStatus({ type: 'error', message: 'Ошибка сохранения: выберите файл изображения.' })
      return
    }
    const fileError = validateFile(form.file)
    if (fileError) {
      setStatus({ type: 'error', message: `Ошибка сохранения: ${fileError}` })
      return
    }

    setSaving(true)
    setStatus({ type: 'info', message: 'Сохранение…' })
    let uploaded = null
    try {
      if (form.file) uploaded = await uploadImage(form.file)
      const title = form.title.trim()
      const payload = {
        title,
        alt_text: form.alt_text.trim() || title,
      }

      if (uploaded) {
        payload.image_url = uploaded.imageUrl
        payload.storage_path = uploaded.storagePath
      }

      if (dialog.mode === 'create') {
        payload.sort_order = rows.reduce((maximum, row) => Math.max(maximum, Number(row.sort_order) || 0), 0) + 1
        const { data, error } = await supabase.from('gallery_images').insert(payload).select().single()
        if (error) throw error
        setRows((current) => [...current, data])
      } else {
        payload.updated_at = new Date().toISOString()
        const { data, error } = await supabase.from('gallery_images').update(payload).eq('id', dialog.row.id).select().single()
        if (error) throw error
        setRows((current) => current.map((row) => row.id === data.id ? data : row))

        if (uploaded && dialog.row.storage_path) {
          const { error: removeError } = await supabase.storage.from('gallery').remove([dialog.row.storage_path])
          if (removeError) setStatus({ type: 'error', message: `Фотография сохранена, но старый файл не удалён: ${removeError.message}` })
        }
      }

      setDialog(null)
      setStatus((current) => current.type === 'error' ? current : { type: 'success', message: 'Успешно сохранено' })
    } catch (error) {
      if (uploaded?.storagePath) await supabase.storage.from('gallery').remove([uploaded.storagePath])
      setStatus({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
    } finally {
      setSaving(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (row) => {
    if (!window.confirm(`Удалить фотографию «${row.title}»?`)) return
    setStatus({ type: 'info', message: 'Сохранение…' })
    try {
      if (row.storage_path) {
        const { error: storageError } = await supabase.storage.from('gallery').remove([row.storage_path])
        if (storageError) throw storageError
      }
      const { error } = await supabase.from('gallery_images').delete().eq('id', row.id)
      if (error) throw error
      setRows((current) => current.filter((item) => item.id !== row.id))
      setStatus({ type: 'success', message: 'Успешно сохранено' })
    } catch (error) {
      setStatus({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section__head">
        <div><span>Фотографии сайта</span><h1>Галерея</h1><p>Первые восемь фотографий сохраняют фирменный макет, остальные выводятся обычными карточками.</p></div>
        <button className="admin-button admin-button--primary" type="button" onClick={openCreate}><Plus size={17} /> Добавить фотографию</button>
      </div>

      <AdminStatus type={loadError ? 'error' : status.type}>{loadError || status.message}</AdminStatus>
      {loading && <AdminStatus>Загрузка…</AdminStatus>}
      {!loading && rows.length === 0 && !loadError && <AdminEmpty>Фотографии пока не добавлены.</AdminEmpty>}

      <div className="admin-gallery-list">
        {rows.map((row) => (
          <article className="admin-gallery-row" key={row.id}>
            <img src={row.image_url} alt={row.alt_text || row.title} />
            <div><strong>{row.title}</strong><p>{row.alt_text || row.title}</p><small>{row.storage_path ? 'Supabase Storage' : 'Локальное изображение'}</small></div>
            <div className="admin-list__actions"><button type="button" onClick={() => openEdit(row)}><Pencil size={15} /> Редактировать</button><button className="is-danger" type="button" onClick={() => remove(row)}><Trash2 size={15} /> Удалить</button></div>
          </article>
        ))}
      </div>

      {dialog && (
        <AdminModal title={dialog.mode === 'create' ? 'Новая фотография' : 'Редактирование фотографии'} onClose={closeDialog}>
          <form className="admin-form" onSubmit={save}>
            <label><span>Название</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>Альтернативный текст</span><textarea rows="3" value={form.alt_text} onChange={(event) => setForm({ ...form, alt_text: event.target.value })} /><small>Если оставить пустым, будет использовано название.</small></label>
            <label className="admin-file"><span>Файл изображения {dialog.mode === 'edit' && '(необязательно)'}</span><input ref={fileInput} required={dialog.mode === 'create'} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} /><div><ImagePlus size={22} /><span>{form.file ? form.file.name : dialog.mode === 'edit' ? 'Выберите файл, чтобы заменить фотографию' : 'JPEG, PNG или WebP — до 10 МБ'}</span></div></label>
            <AdminStatus type={status.type}>{dialog && status.message}</AdminStatus>
            <div className="admin-form__actions"><button type="button" onClick={closeDialog} disabled={saving}>Отмена</button><button className="admin-button--primary" type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div>
          </form>
        </AdminModal>
      )}
    </section>
  )
}
