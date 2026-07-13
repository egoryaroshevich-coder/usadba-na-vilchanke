import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function GalleryModal({ images, selectedIndex, onClose, onChange }) {
  const image = images[selectedIndex]
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onChange((selectedIndex - 1 + images.length) % images.length)
      if (event.key === 'ArrowRight') onChange((selectedIndex + 1) % images.length)
      if (event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll('.gallery-modal button'))
        const firstControl = controls[0]
        const lastControl = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === firstControl) {
          event.preventDefault()
          lastControl?.focus()
        } else if (!event.shiftKey && document.activeElement === lastControl) {
          event.preventDefault()
          firstControl?.focus()
        }
      }
    }
    const previousFocus = document.activeElement
    const background = document.querySelectorAll('.site-header, main, .site-footer')
    background.forEach((element) => { element.inert = true })
    document.body.classList.add('modal-open')
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      background.forEach((element) => { element.inert = false })
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [images.length, onChange, onClose, selectedIndex])

  if (!image) return null

  return (
    <div className="gallery-modal" role="dialog" aria-modal="true" aria-label={`Фотография: ${image.title}`} onClick={onClose}>
      <button ref={closeButtonRef} className="gallery-modal__close" type="button" onClick={onClose} aria-label="Закрыть фотографию">
        <X size={28} />
      </button>
      <button
        className="gallery-modal__arrow gallery-modal__arrow--prev"
        type="button"
        aria-label="Предыдущая фотография"
        onClick={(event) => {
          event.stopPropagation()
          onChange((selectedIndex - 1 + images.length) % images.length)
        }}
      >
        <ChevronLeft size={30} />
      </button>
      <figure className="gallery-modal__figure" onClick={(event) => event.stopPropagation()}>
        <img src={image.src} alt={image.alt} />
        <figcaption>
          <span>{image.title}</span>
          <span>{String(selectedIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span>
        </figcaption>
      </figure>
      <button
        className="gallery-modal__arrow gallery-modal__arrow--next"
        type="button"
        aria-label="Следующая фотография"
        onClick={(event) => {
          event.stopPropagation()
          onChange((selectedIndex + 1) % images.length)
        }}
      >
        <ChevronRight size={30} />
      </button>
    </div>
  )
}
