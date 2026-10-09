import { z } from 'zod'
import type { DadosDaAnamnese } from '@/api/tipos'

type Resposta = 'sim' | 'nao' | 'nao_informado'
type CampoBooleano = {
  [K in keyof DadosDaAnamnese]-?: NonNullable<DadosDaAnamnese[K]> extends boolean ? K : never
}[keyof DadosDaAnamnese]

export const PERGUNTAS: { campo: CampoBooleano; pergunta: string }[] = [
  { campo: 'alergico', pergunta: 'Possui alguma alergia?' },
  { campo: 'usaAnticoagulante', pergunta: 'Usa anticoagulante?' },
  { campo: 'diabetes', pergunta: 'Tem diabetes?' },
  { campo: 'hipertensao', pergunta: 'Tem hipertensão?' },
  { campo: 'cardiopatia', pergunta: 'Tem alguma cardiopatia?' },
  { campo: 'coagulopatia', pergunta: 'Tem distúrbio de coagulação?' },
  { campo: 'gestante', pergunta: 'Está gestante?' },
  { campo: 'fumante', pergunta: 'É fumante?' },
  { campo: 'usaBisfosfonatos', pergunta: 'Usa bisfosfonatos (ex.: alendronato)?' },
  { campo: 'reacaoAnestesia', pergunta: 'Já teve reação a anestesia?' },
]

const resposta = z.enum(['sim', 'nao', 'nao_informado'])

export const esquemaAnamnese = z
  .object({
    alergico: resposta,
    usaAnticoagulante: resposta,
    diabetes: resposta,
    hipertensao: resposta,
    cardiopatia: resposta,
    coagulopatia: resposta,
    gestante: resposta,
    fumante: resposta,
    usaBisfosfonatos: resposta,
    reacaoAnestesia: resposta,
    alergiasDescricao: z.string().trim().max(500),
    semanasGestacao: z.string(),
    medicamentosEmUso: z.string().trim().max(1000),
    observacoes: z.string().trim().max(2000),
  })
  .superRefine((v, ctx) => {
    if (v.alergico === 'sim' && !v.alergiasDescricao) {
      ctx.addIssue({ code: 'custom', path: ['alergiasDescricao'], message: 'Informe a quais substâncias' })
    }
    const semanas = Number(v.semanasGestacao)
    if (v.gestante === 'sim' && (!Number.isInteger(semanas) || semanas < 1 || semanas > 42)) {
      ctx.addIssue({ code: 'custom', path: ['semanasGestacao'], message: 'Informe entre 1 e 42 semanas' })
    }
  })

export type ValoresAnamnese = z.infer<typeof esquemaAnamnese>

const paraResposta = (valor: boolean | null | undefined): Resposta =>
  valor === true ? 'sim' : valor === false ? 'nao' : 'nao_informado'
const paraBooleano = (valor: Resposta): boolean | null =>
  valor === 'sim' ? true : valor === 'nao' ? false : null

export function paraValoresAnamnese(dados: DadosDaAnamnese | null): ValoresAnamnese {
  const d = dados ?? {}
  return {
    alergico: paraResposta(d.alergico),
    usaAnticoagulante: paraResposta(d.usaAnticoagulante),
    diabetes: paraResposta(d.diabetes),
    hipertensao: paraResposta(d.hipertensao),
    cardiopatia: paraResposta(d.cardiopatia),
    coagulopatia: paraResposta(d.coagulopatia),
    gestante: paraResposta(d.gestante),
    fumante: paraResposta(d.fumante),
    usaBisfosfonatos: paraResposta(d.usaBisfosfonatos),
    reacaoAnestesia: paraResposta(d.reacaoAnestesia),
    alergiasDescricao: d.alergiasDescricao ?? '',
    semanasGestacao: d.semanasGestacao != null ? String(d.semanasGestacao) : '',
    medicamentosEmUso: d.medicamentosEmUso ?? '',
    observacoes: d.observacoes ?? '',
  }
}

/** Campos condicionais só seguem quando a resposta que os habilita é "sim". */
export function paraDadosDaAnamnese(v: ValoresAnamnese): DadosDaAnamnese {
  return {
    alergico: paraBooleano(v.alergico),
    usaAnticoagulante: paraBooleano(v.usaAnticoagulante),
    diabetes: paraBooleano(v.diabetes),
    hipertensao: paraBooleano(v.hipertensao),
    cardiopatia: paraBooleano(v.cardiopatia),
    coagulopatia: paraBooleano(v.coagulopatia),
    gestante: paraBooleano(v.gestante),
    fumante: paraBooleano(v.fumante),
    usaBisfosfonatos: paraBooleano(v.usaBisfosfonatos),
    reacaoAnestesia: paraBooleano(v.reacaoAnestesia),
    alergiasDescricao: v.alergico === 'sim' ? v.alergiasDescricao || null : null,
    semanasGestacao: v.gestante === 'sim' ? Number(v.semanasGestacao) : null,
    medicamentosEmUso: v.medicamentosEmUso || null,
    observacoes: v.observacoes || null,
  }
}
