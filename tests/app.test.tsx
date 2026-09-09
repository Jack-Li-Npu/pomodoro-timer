import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import App from '../src/App'
import { DATA_KEY } from '../src/lib/storage'
import { initialState, reducer } from '../src/lib/model'
vi.mock('../src/lib/audio', () => ({
  unlockAudio: vi.fn(async () => {}),
  chime: vi.fn(),
  downloadText: vi.fn(),
}))
it('adds a task, saves a return ticket, switches languages, and restores after reload', async () => {
  localStorage.setItem(DATA_KEY, JSON.stringify(initialState('en')))
  const user = userEvent.setup()
  const view = render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Add a task' }))
  await user.type(
    screen.getByRole('textbox', { name: 'What would you like to move forward?' }),
    'Write the first paragraph',
  )
  await user.click(screen.getByRole('button', { name: 'Add', exact: true }))
  await user.type(screen.getByRole('textbox', { name: 'Your return ticket' }), 'Open the outline')
  await user.click(screen.getByRole('button', { name: 'Language' }))
  await waitFor(() => expect(document.documentElement.lang).toBe('zh-CN'))
  view.unmount()
  render(<App />)
  expect(await screen.findByDisplayValue('Open the outline')).toBeInTheDocument()
  expect(document.documentElement.lang).toBe('zh-CN')
  expect(JSON.parse(localStorage.getItem(DATA_KEY)!).tasks[0].title).toBe(
    'Write the first paragraph',
  )
})
it('saves a completed timer once and waits for the user to start the break', async () => {
  vi.useFakeTimers()
  const now = Date.now()
  const state = reducer(initialState(), { type: 'toggle', now: now - 1499000 })
  localStorage.setItem(DATA_KEY, JSON.stringify(state))
  render(<App />)
  await act(async () => {
    vi.advanceTimersByTime(1500)
  })
  expect(screen.getByRole('button', { name: 'Next: Short break' })).toBeInTheDocument()
  let saved = JSON.parse(localStorage.getItem(DATA_KEY)!)
  expect(saved.sessions).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Next: Short break' }))
  expect(screen.getByRole('button', { name: 'Start break' })).toBeInTheDocument()
  await act(async () => {
    vi.advanceTimersByTime(60000)
  })
  saved = JSON.parse(localStorage.getItem(DATA_KEY)!)
  expect(saved.timer.status).toBe('idle')
  expect(saved.sessions).toHaveLength(1)
})
it('does not toggle the timer when typing spaces in a note or when a dialog is open', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.type(screen.getByRole('textbox', { name: 'Your return ticket' }), 'A small next step')
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Settings', exact: true }))
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  fireEvent.keyDown(document.body, { code: 'Space' })
  expect(screen.getByRole('button', { name: 'Start focusing' })).toBeInTheDocument()
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
  fireEvent.keyDown(document.body, { code: 'Space' })
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
})
it('requires review before replacing a workspace with an imported backup', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Settings', exact: true }))
  const backup = reducer(initialState(), { type: 'addTask', title: 'Imported plan', estimate: 2 })
  const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(backup) })
  await user.upload(screen.getByLabelText('Import backup'), file)
  expect(await screen.findByText('Review backup')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(DATA_KEY)!).tasks).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Replace with this backup' }))
  expect(screen.getByRole('button', { name: 'Focus on Imported plan' })).toBeInTheDocument()
})
