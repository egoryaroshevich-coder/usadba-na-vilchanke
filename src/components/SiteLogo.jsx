import { siteData } from '../data/siteData.js'

export default function SiteLogo({ light = false }) {
  return (
    <span className={`site-logo ${light ? 'site-logo--light' : ''}`} aria-label={siteData.brand.name}>
      <span className="site-logo__mark" aria-hidden="true">
        <img src={siteData.brand.logo} alt="" />
      </span>
      <span className="site-logo__text">
        <small>Усадьба</small>
        <strong>{siteData.brand.shortName}</strong>
      </span>
    </span>
  )
}
