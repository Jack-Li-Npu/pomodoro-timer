import { useState, useEffect, useRef } from 'react'
import PomodoroTimer from './components/PomodoroTimer'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <PomodoroTimer />
    </div>
  )
}

export default App

