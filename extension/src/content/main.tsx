import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './views/App'
import cssText from './views/App.css?inline'

const HOST_ID = 'anywear-replica-host'

if (!document.getElementById(HOST_ID)) {
  const host = document.createElement('div')

  host.id = HOST_ID

  const shadowRoot = host.attachShadow({
    mode: 'open',
  })

  const style = document.createElement('style')

  style.textContent = cssText

  shadowRoot.appendChild(style)

  const mount = document.createElement('div')

  shadowRoot.appendChild(mount)

  document.documentElement.appendChild(host)

  createRoot(mount).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}