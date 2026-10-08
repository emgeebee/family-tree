import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { config } from './config.js'
import AuthProvider from './context/AuthProvider.jsx'
import FamilyTreeProvider from './context/FamilyTreeProvider.jsx'
import './styles/global.css'

const app = (
  <FamilyTreeProvider>
    <App />
  </FamilyTreeProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>{config.googleClientId ? <AuthProvider>{app}</AuthProvider> : app}</StrictMode>,
)
