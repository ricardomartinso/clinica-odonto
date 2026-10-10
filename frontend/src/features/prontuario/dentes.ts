import type { Abrangencia, Arcada, Face } from '@/api/tipos'

/**
 * Notação FDI, espelhando o value object Dente do backend: dezena = quadrante, unidade = posição.
 * Permanentes 11–48, decíduos 51–85.
 */
export const QUADRANTES: { titulo: string; dentes: number[] }[] = [
  { titulo: 'Superior direito', dentes: [18, 17, 16, 15, 14, 13, 12, 11] },
  { titulo: 'Superior esquerdo', dentes: [21, 22, 23, 24, 25, 26, 27, 28] },
  { titulo: 'Inferior esquerdo', dentes: [31, 32, 33, 34, 35, 36, 37, 38] },
  { titulo: 'Inferior direito', dentes: [48, 47, 46, 45, 44, 43, 42, 41] },
  { titulo: 'Decíduos — superior direito', dentes: [55, 54, 53, 52, 51] },
  { titulo: 'Decíduos — superior esquerdo', dentes: [61, 62, 63, 64, 65] },
  { titulo: 'Decíduos — inferior esquerdo', dentes: [71, 72, 73, 74, 75] },
  { titulo: 'Decíduos — inferior direito', dentes: [85, 84, 83, 82, 81] },
]

export const FACES: Face[] = ['M', 'D', 'O_I', 'V', 'L_P']

const superior = (dente: number) => [1, 2, 5, 6].includes(Math.floor(dente / 10))
const anterior = (dente: number) => dente % 10 <= 3

/** Nome da face no dente: incisal/oclusal e palatina/lingual dependem da posição. */
export function nomeDaFace(face: Face, dente: number | null): string {
  switch (face) {
    case 'M':
      return 'Mesial'
    case 'D':
      return 'Distal'
    case 'V':
      return 'Vestibular'
    case 'O_I':
      return dente === null ? 'Oclusal/Incisal' : anterior(dente) ? 'Incisal' : 'Oclusal'
    case 'L_P':
      return dente === null ? 'Lingual/Palatina' : superior(dente) ? 'Palatina' : 'Lingual'
  }
}

export const ROTULO_ARCADA: Record<Arcada, string> = {
  SUPERIOR: 'Arcada superior',
  INFERIOR: 'Arcada inferior',
}

/** Mesma descrição que o backend devolve em `local`, para itens ainda não enviados. */
export function descreverLocal(
  abrangencia: Abrangencia,
  dente: number | null,
  faces: Face[],
  arcada: Arcada | null,
): string {
  switch (abrangencia) {
    case 'FACE':
      return `${dente} · ${FACES.filter((f) => faces.includes(f))
        .map((f) => nomeDaFace(f, dente))
        .join(', ')}`
    case 'DENTE':
      return `Dente ${dente}`
    case 'ARCADA':
      return arcada ? ROTULO_ARCADA[arcada] : ''
    case 'BOCA':
      return 'Boca toda'
  }
}
