import { useEffect, useState } from 'react'
import { siteData } from '../data/siteData.js'
import {
  fetchGalleryImages,
  fetchMenuContent,
  fetchPriceCards,
  toPublicGallery,
  toPublicMenu,
  toPublicPrices,
} from '../lib/content.js'

export default function usePublicContent() {
  const [content, setContent] = useState({ prices: [], menu: [], gallery: [] })

  useEffect(() => {
    let active = true

    Promise.allSettled([fetchPriceCards(), fetchMenuContent(), fetchGalleryImages()])
      .then(([pricesResult, menuResult, galleryResult]) => {
        if (!active) return
        setContent({
          prices: pricesResult.status === 'fulfilled'
            ? toPublicPrices(pricesResult.value)
            : siteData.prices,
          menu: menuResult.status === 'fulfilled'
            ? toPublicMenu(menuResult.value)
            : siteData.menu,
          gallery: galleryResult.status === 'fulfilled'
            ? toPublicGallery(galleryResult.value)
            : siteData.gallery,
        })
      })

    return () => { active = false }
  }, [])

  return content
}
