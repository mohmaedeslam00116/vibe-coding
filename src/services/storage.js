/**
 * Storage service — LocalStorage wrapper with reactive events
 */

const STORAGE_KEYS = {
  API_KEY: 'vibecoding_api_key',
  LAST_IDEA: 'vibecoding_last_idea',
  SETTINGS: 'vibecoding_settings',
}

class StorageService {
  getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
  }

  setApiKey(key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key)
    window.dispatchEvent(new CustomEvent('vibecoding:apikey-changed', { detail: { key } }))
  }

  clearApiKey() {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
    window.dispatchEvent(new CustomEvent('vibecoding:apikey-changed', { detail: { key: '' } }))
  }

  hasApiKey() {
    const key = this.getApiKey()
    return key.length > 0
  }

  getLastIdea() {
    return localStorage.getItem(STORAGE_KEYS.LAST_IDEA) || ''
  }

  setLastIdea(idea) {
    localStorage.setItem(STORAGE_KEYS.LAST_IDEA, idea)
  }

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}')
    } catch {
      return {}
    }
  }

  setSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  }
}

export const storage = new StorageService()
