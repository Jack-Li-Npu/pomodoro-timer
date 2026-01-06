import { useState, useEffect, useRef } from 'react'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const TIMER_DURATIONS = {
  work: 25 * 60, // 25 分钟
  shortBreak: 5 * 60, // 5 分钟
  longBreak: 15 * 60, // 15 分钟
}

const PomodoroTimer = () => {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.work)
  const [isRunning, setIsRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            playSound()
            if (mode === 'work') {
              setCompletedPomodoros((count) => count + 1)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, mode])

  const playSound = () => {
    // 使用 Web Audio API 播放提示音
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(TIMER_DURATIONS[mode])
  }

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode)
    setIsRunning(false)
    setTimeLeft(TIMER_DURATIONS[newMode])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    return ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100
  }

  const getModeConfig = (timerMode: TimerMode) => {
    switch (timerMode) {
      case 'work':
        return {
          label: '专注工作',
          color: 'bg-pomodoro-red',
          hoverColor: 'hover:bg-red-600',
          activeColor: 'ring-red-300',
        }
      case 'shortBreak':
        return {
          label: '短休息',
          color: 'bg-pomodoro-green',
          hoverColor: 'hover:bg-green-600',
          activeColor: 'ring-green-300',
        }
      case 'longBreak':
        return {
          label: '长休息',
          color: 'bg-pomodoro-blue',
          hoverColor: 'hover:bg-blue-600',
          activeColor: 'ring-blue-300',
        }
    }
  }

  const currentConfig = getModeConfig(mode)

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-2xl p-8 transform transition-all hover:scale-105 duration-300">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🍅 番茄钟</h1>
          <p className="text-gray-500 text-sm">专注工作，高效生活</p>
        </div>

        {/* 模式切换按钮 */}
        <div className="flex gap-2 mb-8">
          {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((timerMode) => {
            const config = getModeConfig(timerMode)
            return (
              <button
                key={timerMode}
                onClick={() => changeMode(timerMode)}
                className={`flex-1 py-2 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  mode === timerMode
                    ? `${config.color} text-white shadow-lg ring-4 ${config.activeColor}`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config.label}
              </button>
            )
          })}
        </div>

        {/* 圆形进度条和时间显示 */}
        <div className="relative mb-8">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* 背景圆 */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="12"
            />
            {/* 进度圆 */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke={currentConfig.color.replace('bg-', '#')}
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 85}`}
              strokeDashoffset={`${2 * Math.PI * 85 * (1 - getProgressPercentage() / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
              style={{
                stroke: mode === 'work' ? '#e74c3c' : mode === 'shortBreak' ? '#27ae60' : '#3498db'
              }}
            />
          </svg>
          
          {/* 时间显示 */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <div className="text-6xl font-bold text-gray-800 mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              {timeLeft === 0 ? '时间到！' : isRunning ? '计时中...' : '准备开始'}
            </div>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={toggleTimer}
            disabled={timeLeft === 0}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg text-white shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              currentConfig.color
            } ${currentConfig.hoverColor}`}
          >
            {isRunning ? '⏸️ 暂停' : '▶️ 开始'}
          </button>
          <button
            onClick={resetTimer}
            className="py-4 px-6 rounded-xl font-bold text-lg text-gray-700 bg-gray-200 hover:bg-gray-300 shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            🔄 重置
          </button>
        </div>

        {/* 番茄数统计 */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">今日完成</div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-pomodoro-red">
              {completedPomodoros}
            </span>
            <span className="text-lg text-gray-600">个番茄</span>
          </div>
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: Math.min(completedPomodoros, 8) }).map((_, i) => (
              <span key={i} className="text-xl">🍅</span>
            ))}
          </div>
        </div>

        {/* 提示文字 */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>💡 每25分钟专注工作，5分钟短休息</p>
          <p className="mt-1">完成4个番茄后，可以休息15分钟</p>
        </div>
      </div>
    </div>
  )
}

export default PomodoroTimer

