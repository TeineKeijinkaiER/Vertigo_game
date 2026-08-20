import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Gallery from './Gallery'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has('gallery') ? <Gallery /> : <App />}
  </StrictMode>,
)
