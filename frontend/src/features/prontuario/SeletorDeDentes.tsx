import { useState } from 'react'
import { Button } from '@/components/ui/button'

/** Disposição como o dentista vê o paciente de frente: o lado direito do paciente fica à esquerda. */
const PERMANENTES = {
  superior: [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ],
  inferior: [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ],
}
const DECIDUOS = {
  superior: [
    [55, 54, 53, 52, 51],
    [61, 62, 63, 64, 65],
  ],
  inferior: [
    [85, 84, 83, 82, 81],
    [71, 72, 73, 74, 75],
  ],
}

interface Props {
  idRotulo: string
  selecionados: number[]
  aoMudar: (dentes: number[]) => void
  /** Vários dentes (selante, exodontia…) ou um só (restauração, cujas faces variam por dente). */
  multiplo: boolean
  invalido?: boolean
}

export function SeletorDeDentes({ idRotulo, selecionados, aoMudar, multiplo, invalido }: Props) {
  const [mostrarDeciduos, setMostrarDeciduos] = useState(() => selecionados.some((d) => d >= 50))

  const alternar = (dente: number) => {
    if (!multiplo) {
      aoMudar(selecionados.includes(dente) ? [] : [dente])
      return
    }
    aoMudar(
      selecionados.includes(dente)
        ? selecionados.filter((d) => d !== dente)
        : [...selecionados, dente].sort((a, b) => a - b),
    )
  }

  const arcada = (linhas: number[][]) => (
    <div className="flex justify-center gap-3">
      {linhas.map((lado, i) => (
        <div key={i} className="flex gap-1">
          {lado.map((dente) => {
            const marcado = selecionados.includes(dente)
            return (
              <button
                key={dente}
                type="button"
                aria-pressed={marcado}
                aria-label={`Dente ${dente}`}
                onClick={() => alternar(dente)}
                className={`size-9 rounded-md border text-sm tabular-nums transition-colors ${
                  marcado
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {dente}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div
      role="group"
      aria-labelledby={idRotulo}
      aria-invalid={invalido}
      className={`space-y-2 overflow-x-auto rounded-md border p-3 ${invalido ? 'border-destructive' : ''}`}
    >
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Direita do paciente</span>
        <span>Esquerda do paciente</span>
      </div>
      {arcada(PERMANENTES.superior)}
      <div className="border-t" />
      {arcada(PERMANENTES.inferior)}
      {mostrarDeciduos && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">Dentes decíduos</p>
          {arcada(DECIDUOS.superior)}
          <div className="border-t" />
          {arcada(DECIDUOS.inferior)}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {selecionados.length === 0
            ? multiplo
              ? 'Toque nos dentes para selecionar.'
              : 'Toque no dente.'
            : `Selecionado${selecionados.length > 1 ? 's' : ''}: ${selecionados.join(', ')}`}
        </span>
        <Button type="button" variant="link" size="sm" onClick={() => setMostrarDeciduos((m) => !m)}>
          {mostrarDeciduos ? 'Ocultar decíduos' : 'Mostrar decíduos'}
        </Button>
      </div>
    </div>
  )
}
