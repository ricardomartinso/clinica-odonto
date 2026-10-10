import { z } from 'zod'
import { hojeIso } from '@/lib/formatos'

export const esquemaEvolucao = z.object({
  dataAtendimento: z
    .string()
    .min(1, 'Informe a data')
    .refine((v) => v <= hojeIso(), 'A data não pode estar no futuro'),
  texto: z.string().trim().min(1, 'Descreva o atendimento').max(10000),
})
