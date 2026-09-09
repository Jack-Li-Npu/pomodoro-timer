let context: AudioContext | undefined
export async function unlockAudio(): Promise<void> {
  if (typeof AudioContext === 'undefined') return
  context ??= new AudioContext()
  if (context.state === 'suspended') await context.resume()
}
export function chime(): void {
  if (!context || context.state !== 'running') return
  for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    const start = context.currentTime + index * 0.12
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.13, start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)
    oscillator.start(start)
    oscillator.stop(start + 0.65)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }
}
export function downloadText(contents: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
