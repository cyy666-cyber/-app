import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>DeepSeek Mobile App</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          🎉 实时预览测试成功！
        </p>
        <p style={{ color: '#646cff', marginTop: '10px' }}>
          修改代码后，模拟器会自动刷新
        </p>
        <p style={{ color: '#42b883', marginTop: '10px', fontWeight: 'bold' }}>
          ✅ 如果你看到这条消息，说明实时预览功能正常工作！
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
