import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import './modeator.css'
import Login from './login.jsx'


// import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <App /> */}
    < Login/>
  </StrictMode>,
)
