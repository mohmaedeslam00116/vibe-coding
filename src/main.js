/**
 * Vibe Coding — Entry Point
 */

import './styles/variables.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import { init } from './app.js'

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app')
  if (app) {
    init(app)
  }
})
