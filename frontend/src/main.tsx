import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { criarApp } from './criar-app'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App app={criarApp()} />
  </StrictMode>,
)
