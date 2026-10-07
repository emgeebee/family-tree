import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import FamilyTreeProvider from './context/FamilyTreeProvider.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FamilyTreeProvider>
      <App />
    </FamilyTreeProvider>
  </StrictMode>,
)
