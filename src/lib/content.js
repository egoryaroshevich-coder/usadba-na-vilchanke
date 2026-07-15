import { supabase } from './supabase.js'

export const supportedPriceIcons = [
  'House',
  'Waves',
  'Trees',
  'Flame',
  'BedDouble',
  'CarFront',
  'Lamp',
  'PartyPopper',
  'Sparkles',
  'UtensilsCrossed',
]

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase не настроен: проверьте переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}

export const formatMenuPrice = (value, unit = 'р.') => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return `${value} ${unit}`.trim()
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue)
  return `${formatted} ${unit || 'р.'}`.trim()
}

const transliterationMap = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export const slugify = (value) => value
  .toLowerCase()
  .trim()
  .split('')
  .map((character) => transliterationMap[character] ?? character)
  .join('')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export async function fetchPriceCards() {
  const { data, error } = await requireSupabase()
    .from('price_cards')
    .select('id,title,description,price,unit,details,icon,featured,badge,sort_order,updated_at')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchMenuContent() {
  const client = requireSupabase()
  const [categoriesResult, itemsResult] = await Promise.all([
    client
      .from('menu_categories')
      .select('id,slug,label,sort_order,updated_at')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
    client
      .from('menu_items')
      .select('id,category_id,name,description,weight,price,price_unit,sort_order,updated_at')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ])
  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error
  return {
    categories: categoriesResult.data || [],
    items: itemsResult.data || [],
  }
}

export async function fetchGalleryImages() {
  const { data, error } = await requireSupabase()
    .from('gallery_images')
    .select('id,title,alt_text,image_url,storage_path,sort_order,updated_at')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data || []
}

export const toPublicPrices = (rows) => rows.map((row) => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  price: row.price,
  unit: row.unit || '',
  details: Array.isArray(row.details) ? row.details : [],
  icon: row.icon || 'Sparkles',
  featured: Boolean(row.featured),
  badge: row.badge || '',
}))

export const toPublicMenu = ({ categories, items }) => categories.map((category) => ({
  id: category.id,
  slug: category.slug,
  label: category.label,
  items: items
    .filter((item) => String(item.category_id) === String(category.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      weight: item.weight || '',
      price: formatMenuPrice(item.price, item.price_unit),
    })),
}))

export const toPublicGallery = (rows) => rows.map((row) => ({
  id: row.id,
  src: row.image_url,
  title: row.title,
  alt: row.alt_text || row.title,
}))
