# 番茄钟应用

使用 React + TypeScript + Tailwind CSS 开发的番茄钟计时器。

## 功能

- 计时器：25分钟工作时间、5分钟短休息、15分钟长休息
- 暂停/继续
- 重置功能
- 圆形进度条显示
- 完成统计
- 时间到达提示音

## 安装和运行

安装依赖：
```bash
npm install
```

启动开发服务器：
```bash
npm run dev
```

构建生产版本：
```bash
npm run build
```

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Web Audio API

## 项目结构

```
├── src/
│   ├── components/
│   │   └── PomodoroTimer.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 自定义时间设置

在 `PomodoroTimer.tsx` 中修改：

```typescript
const TIMER_DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}
```

## License

MIT

