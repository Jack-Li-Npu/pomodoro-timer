import {
  ArrowUpRight,
  CheckCircle2,
  Coffee,
  CornerDownLeft,
  Feather,
  Keyboard,
  Sprout,
  Timer,
} from 'lucide-react'
import { OfflineStatus } from '../hooks/useOffline'
import { useTranslation } from 'react-i18next'
export default function Guide({
  demo,
  offlineStatus,
}: {
  demo: boolean
  offlineStatus: OfflineStatus
}) {
  const { t } = useTranslation()
  const steps = [
    { key: 'One', icon: CheckCircle2 },
    { key: 'Two', icon: Sprout },
    { key: 'Three', icon: Feather },
    { key: 'Four', icon: CornerDownLeft },
    { key: 'Five', icon: Coffee },
  ]
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{t('guide')}</span>
        <h1>{t('guideTitle')}</h1>
        <p>{t('guideSub')}</p>
      </div>
      <div className="guide-grid">
        {steps.map(({ key, icon: Icon }, index) => (
          <section className="card guide-card" key={key}>
            <div className="guide-number">
              <Icon size={22} />
              <span>0{index + 1}</span>
            </div>
            <h2>{t(`guide${key}`)}</h2>
            <p>{t(`guide${key}Text`)}</p>
          </section>
        ))}
        <section className="guide-demo">
          <span className="eyebrow">POMO STUDIO</span>
          <h2>{t('tagline')}</h2>
          <a className="button primary" href={demo ? '?' : '?demo=1'}>
            {t(demo ? 'leaveDemo' : 'tryDemo')}
            <ArrowUpRight size={17} />
          </a>
        </section>
      </div>
      <div className="guide-footnotes">
        <section className="card">
          <h2>
            <Keyboard size={19} />
            {t('shortcuts')}
          </h2>
          <p>
            <kbd>Space</kbd> {t('shortcutSpace')}
          </p>
          <p>
            <kbd>Esc</kbd> {t('shortcutEsc')}
          </p>
          <p className="muted">{t('shortcutNote')}</p>
        </section>
        <section className="card">
          <h2>
            <Timer size={19} />
            {t('honestTimer')}
          </h2>
          <p>{t('honestTimerText')}</p>
          <h3>{t('offlineTitle')}</h3>
          <p role="status" className="offline-status">
            {t(offlineStatus)}
          </p>
          <p>{t('offlineText')}</p>
        </section>
      </div>
    </>
  )
}
