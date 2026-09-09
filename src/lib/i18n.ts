import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/default/en'
import zh from '../locales/default/zh'
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})
export default i18n
