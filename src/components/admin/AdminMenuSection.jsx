import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { fetchMenuContent, formatMenuPrice, slugify } from '../../lib/content.js'
import { supabase } from '../../lib/supabase.js'
import { AdminEmpty, AdminModal, AdminStatus } from './AdminCommon.jsx'

const emptyCategory = { label: '', slug: '' }
const emptyItem = { category_id: '', name: '', description: '', weight: '', price: '' }

export default function AdminMenuSection() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [categoryDialog, setCategoryDialog] = useState(null)
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [itemDialog, setItemDialog] = useState(null)
  const [itemForm, setItemForm] = useState(emptyItem)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await fetchMenuContent()
      setCategories(result.categories)
      setItems(result.items)
    } catch (error) {
      setLoadError(`Ошибка загрузки: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (filter !== 'all' && !categories.some((category) => String(category.id) === filter)) setFilter('all')
  }, [categories, filter])

  const visibleItems = useMemo(
    () => filter === 'all' ? items : items.filter((item) => String(item.category_id) === filter),
    [filter, items],
  )

  const categoryName = (id) => categories.find((category) => String(category.id) === String(id))?.label || 'Без категории'

  const openCategoryCreate = () => {
    setCategoryDialog({ mode: 'create' })
    setCategoryForm(emptyCategory)
    setStatus({ type: '', message: '' })
  }

  const openCategoryEdit = (category) => {
    setCategoryDialog({ mode: 'edit', row: category })
    setCategoryForm({ label: category.label, slug: category.slug })
    setStatus({ type: '', message: '' })
  }

  const saveCategory = async (event) => {
    event.preventDefault()
    const finalSlug = slugify(categoryForm.slug || categoryForm.label)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(finalSlug)) {
      setStatus({ type: 'error', message: 'Ошибка сохранения: slug должен содержать латинские буквы, цифры и дефисы.' })
      return
    }
    const duplicate = categories.some((category) => category.slug === finalSlug && String(category.id) !== String(categoryDialog.row?.id))
    if (duplicate) {
      setStatus({ type: 'error', message: 'Ошибка сохранения: такой slug уже используется.' })
      return
    }

    setSaving(true)
    setStatus({ type: 'info', message: 'Сохранение…' })
    const payload = { label: categoryForm.label.trim(), slug: finalSlug }
    try {
      if (categoryDialog.mode === 'create') {
        payload.sort_order = categories.reduce((maximum, category) => Math.max(maximum, Number(category.sort_order) || 0), 0) + 1
        const { data, error } = await supabase.from('menu_categories').insert(payload).select().single()
        if (error) throw error
        setCategories((current) => [...current, data])
      } else {
        payload.updated_at = new Date().toISOString()
        const { data, error } = await supabase.from('menu_categories').update(payload).eq('id', categoryDialog.row.id).select().single()
        if (error) throw error
        setCategories((current) => current.map((category) => category.id === data.id ? data : category))
      }
      setCategoryDialog(null)
      setStatus({ type: 'success', message: 'Успешно сохранено' })
    } catch (error) {
      setStatus({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const removeCategory = async (category) => {
    const { count, error: countError } = await supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id)
    if (countError) {
      setStatus({ type: 'error', message: `Ошибка загрузки: ${countError.message}` })
      return
    }
    if (count > 0) {
      setStatus({ type: 'error', message: 'Сначала удалите блюда из этой категории или перенесите их в другую категорию' })
      return
    }
    if (!window.confirm(`Удалить категорию «${category.label}»?`)) return
    setStatus({ type: 'info', message: 'Сохранение…' })
    const { error } = await supabase.from('menu_categories').delete().eq('id', category.id)
    if (error) {
      setStatus({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
      return
    }
    setCategories((current) => current.filter((item) => item.id !== category.id))
    setStatus({ type: 'success', message: 'Успешно сохранено' })
  }

  const openItemCreate = () => {
    const defaultCategory = filter !== 'all' ? filter : categories[0]?.id || ''
    setItemDialog({ mode: 'create' })
    setItemForm({ ...emptyItem, category_id: defaultCategory })
    setStatus({ type: '', message: '' })
  }

  const openItemEdit = (item) => {
    setItemDialog({ mode: 'edit', row: item })
    setItemForm({
      category_id: item.category_id,
      name: item.name || '',
      description: item.description || '',
      weight: item.weight || '',
      price: String(item.price ?? '').replace('.', ','),
    })
    setStatus({ type: '', message: '' })
  }

  const saveItem = async (event) => {
    event.preventDefault()
    const normalizedPrice = String(itemForm.price).trim().replace(',', '.')
    const price = Number(normalizedPrice)
    if (!Number.isFinite(price) || price < 0) {
      setStatus({ type: 'error', message: 'Ошибка сохранения: укажите корректную цену.' })
      return
    }

    setSaving(true)
    setStatus({ type: 'info', message: 'Сохранение…' })
    const payload = {
      category_id: itemForm.category_id,
      name: itemForm.name.trim(),
      description: itemForm.description.trim(),
      weight: itemForm.weight.trim(),
      price,
      price_unit: 'р.',
    }

    try {
      const movingToAnotherCategory = itemDialog.mode === 'edit' && String(itemDialog.row.category_id) !== String(itemForm.category_id)
      if (itemDialog.mode === 'create' || movingToAnotherCategory) {
        payload.sort_order = items
          .filter((item) => String(item.category_id) === String(itemForm.category_id))
          .reduce((maximum, item) => Math.max(maximum, Number(item.sort_order) || 0), 0) + 1
      }

      if (itemDialog.mode === 'create') {
        const { data, error } = await supabase.from('menu_items').insert(payload).select().single()
        if (error) throw error
        setItems((current) => [...current, data])
      } else {
        payload.updated_at = new Date().toISOString()
        const { data, error } = await supabase.from('menu_items').update(payload).eq('id', itemDialog.row.id).select().single()
        if (error) throw error
        setItems((current) => current.map((item) => item.id === data.id ? data : item))
      }
      setItemDialog(null)
      setStatus({ type: 'success', message: 'Успешно сохранено' })
    } catch (error) {
      setStatus({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (item) => {
    if (!window.confirm(`Удалить блюдо «${item.name}»?`)) return
    setStatus({ type: 'info', message: 'Сохранение…' })
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (error) {
      setStatus({ type: 'error', message: `Ошибка сохранения: ${error.message}` })
      return
    }
    setItems((current) => current.filter((row) => row.id !== item.id))
    setStatus({ type: 'success', message: 'Успешно сохранено' })
  }

  return (
    <section className="admin-section">
      <div className="admin-section__head">
        <div><span>Структура меню</span><h1>Меню блюд</h1><p>Сначала создайте категории, затем добавьте в них блюда.</p></div>
      </div>
      <AdminStatus type={loadError ? 'error' : status.type}>{loadError || status.message}</AdminStatus>
      {loading && <AdminStatus>Загрузка…</AdminStatus>}

      {!loading && (
        <>
          <div className="admin-subsection">
            <div className="admin-subsection__head"><div><h2>Категории</h2><p>{categories.length} категорий</p></div><button className="admin-button admin-button--primary" type="button" onClick={openCategoryCreate}><Plus size={16} /> Добавить</button></div>
            {categories.length === 0 ? <AdminEmpty>Категории пока не добавлены.</AdminEmpty> : (
              <div className="admin-list">
                {categories.map((category) => (
                  <div className="admin-list__row" key={category.id}>
                    <div><strong>{category.label}</strong><small>/{category.slug} · {items.filter((item) => String(item.category_id) === String(category.id)).length} блюд</small></div>
                    <div className="admin-list__actions"><button type="button" onClick={() => openCategoryEdit(category)}><Pencil size={15} /> Редактировать</button><button className="is-danger" type="button" onClick={() => removeCategory(category)}><Trash2 size={15} /> Удалить</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-subsection">
            <div className="admin-subsection__head admin-subsection__head--wrap">
              <div><h2>Блюда</h2><p>{visibleItems.length} позиций</p></div>
              <div className="admin-subsection__tools">
                <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Фильтр блюд по категории"><option value="all">Все категории</option>{categories.map((category) => <option value={String(category.id)} key={category.id}>{category.label}</option>)}</select>
                <button className="admin-button admin-button--primary" type="button" onClick={openItemCreate} disabled={categories.length === 0}><Plus size={16} /> Добавить</button>
              </div>
            </div>
            {visibleItems.length === 0 ? <AdminEmpty>В выбранной категории пока нет блюд.</AdminEmpty> : (
              <div className="admin-list">
                {visibleItems.map((item) => (
                  <div className="admin-list__row admin-list__row--dish" key={item.id}>
                    <div><strong>{item.name}</strong><small>{categoryName(item.category_id)} · {item.weight || 'без веса'} · {formatMenuPrice(item.price, item.price_unit)}</small><p>{item.description}</p></div>
                    <div className="admin-list__actions"><button type="button" onClick={() => openItemEdit(item)}><Pencil size={15} /> Редактировать</button><button className="is-danger" type="button" onClick={() => removeItem(item)}><Trash2 size={15} /> Удалить</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {categoryDialog && (
        <AdminModal title={categoryDialog.mode === 'create' ? 'Новая категория' : 'Редактирование категории'} onClose={() => setCategoryDialog(null)}>
          <form className="admin-form" onSubmit={saveCategory}>
            <label><span>Название</span><input required value={categoryForm.label} onChange={(event) => setCategoryForm({ ...categoryForm, label: event.target.value })} /></label>
            <label><span>Slug</span><input value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value.toLowerCase() })} placeholder={slugify(categoryForm.label) || 'salads'} /><small>Если оставить пустым, будет создан автоматически.</small></label>
            <AdminStatus type={status.type}>{categoryDialog && status.message}</AdminStatus>
            <div className="admin-form__actions"><button type="button" onClick={() => setCategoryDialog(null)}>Отмена</button><button className="admin-button--primary" type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div>
          </form>
        </AdminModal>
      )}

      {itemDialog && (
        <AdminModal title={itemDialog.mode === 'create' ? 'Новое блюдо' : 'Редактирование блюда'} onClose={() => setItemDialog(null)}>
          <form className="admin-form" onSubmit={saveItem}>
            <label><span>Категория</span><select required value={itemForm.category_id} onChange={(event) => setItemForm({ ...itemForm, category_id: event.target.value })}><option value="" disabled>Выберите категорию</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label>
            <label><span>Название</span><input required value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} /></label>
            <label><span>Описание</span><textarea rows="3" value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} /></label>
            <div className="admin-form__grid"><label><span>Вес или количество</span><input value={itemForm.weight} onChange={(event) => setItemForm({ ...itemForm, weight: event.target.value })} placeholder="1 кг" /></label><label><span>Цена</span><input required inputMode="decimal" value={itemForm.price} onChange={(event) => setItemForm({ ...itemForm, price: event.target.value })} placeholder="14,5" /><small>Можно использовать точку или запятую.</small></label></div>
            <AdminStatus type={status.type}>{itemDialog && status.message}</AdminStatus>
            <div className="admin-form__actions"><button type="button" onClick={() => setItemDialog(null)}>Отмена</button><button className="admin-button--primary" type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div>
          </form>
        </AdminModal>
      )}
    </section>
  )
}
