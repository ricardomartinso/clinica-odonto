import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App'
import { criarApp } from '@/criar-app'

/** Renderiza a aplicação inteira (rotas, guards, QueryClient) a partir de uma URL. */
export function renderizarApp(url: string) {
  const app = criarApp(createMemoryHistory({ initialEntries: [url] }))
  const usuario = userEvent.setup()
  render(<App app={app} />)
  return { ...app, usuario, screen, urlAtual: () => app.router.state.location.href }
}
