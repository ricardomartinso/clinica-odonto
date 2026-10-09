import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apiFalsa, servidor } from './api-falsa'

// APIs de layout que o jsdom não implementa e os componentes Radix usam.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// scroll restoration do router chama window.scrollTo, que o jsdom não implementa
window.scrollTo = () => {}

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  servidor.resetHandlers()
  apiFalsa.resetar()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})
afterAll(() => servidor.close())
