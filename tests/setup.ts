import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import i18n from '../src/lib/i18n'
beforeEach(async () => {
  vi.stubGlobal('localStorage', new JSDOM('', { url: 'http://localhost' }).window.localStorage)
  localStorage.clear()
  await i18n.changeLanguage('en')
  window.history.replaceState({}, '', '/')
  vi.stubGlobal('Notification', undefined)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}
