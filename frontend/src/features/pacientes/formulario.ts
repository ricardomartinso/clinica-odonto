import { z } from 'zod'
import type { DadosDoPaciente, PacienteResponse } from '@/api/tipos'
import {
  cpfValido,
  idadeEm,
  mascararCep,
  mascararCpf,
  mascararTelefone,
  somenteDigitos,
} from '@/lib/formatos'

/**
 * Valores do formulário: tudo string (como nos inputs, com máscara). A conversão para o contrato da
 * API (só dígitos, vazios como null) fica em {@link paraDadosDoPaciente}.
 */
const texto = (maximo: number) => z.string().trim().max(maximo, `Máximo de ${maximo} caracteres`)
const telefone = z.string().refine((v) => [10, 11].includes(somenteDigitos(v).length), 'Informe DDD e número')

export const esquemaPaciente = z
  .object({
    nome: texto(150).min(1, 'Informe o nome'),
    nomeSocial: texto(150),
    dataNascimento: z
      .string()
      .min(1, 'Informe a data de nascimento')
      .refine((v) => v <= hojeIso(), 'A data não pode estar no futuro'),
    cpf: z.string().refine((v) => v === '' || cpfValido(v), 'CPF inválido'),
    celular: telefone,
    email: z.union([z.literal(''), z.email('E-mail inválido')]),
    endereco: z.object({
      cep: z.string().refine((v) => [0, 8].includes(somenteDigitos(v).length), 'CEP deve ter 8 dígitos'),
      logradouro: texto(150),
      numero: texto(20),
      complemento: texto(100),
      bairro: texto(100),
      cidade: texto(100),
      uf: z.string().regex(/^([A-Za-z]{2})?$/, 'Use a sigla da UF'),
    }),
    responsavel: z.object({
      nome: texto(150),
      cpf: z.string().refine((v) => v === '' || cpfValido(v), 'CPF inválido'),
      telefone: z.string(),
      parentesco: texto(50),
    }),
    observacoes: texto(2000),
  })
  .superRefine((valores, ctx) => {
    const r = valores.responsavel
    const informouResponsavel = Boolean(r.nome || r.cpf || r.telefone || r.parentesco)
    const menor = valores.dataNascimento !== '' && idadeEm(valores.dataNascimento) < 18
    if ((menor || informouResponsavel) && !r.nome) {
      ctx.addIssue({
        code: 'custom',
        path: ['responsavel', 'nome'],
        message: menor ? 'Obrigatório para menores de 18 anos' : 'Informe o nome do responsável',
      })
    }
    if ((menor || informouResponsavel) && ![10, 11].includes(somenteDigitos(r.telefone).length)) {
      ctx.addIssue({ code: 'custom', path: ['responsavel', 'telefone'], message: 'Informe DDD e número' })
    }
  })

export type ValoresPaciente = z.infer<typeof esquemaPaciente>

export const valoresVazios: ValoresPaciente = {
  nome: '',
  nomeSocial: '',
  dataNascimento: '',
  cpf: '',
  celular: '',
  email: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  responsavel: { nome: '', cpf: '', telefone: '', parentesco: '' },
  observacoes: '',
}

const ouNull = (valor: string) => (valor.trim() === '' ? null : valor.trim())
const digitosOuNull = (valor: string) => ouNull(somenteDigitos(valor))

export function paraDadosDoPaciente(v: ValoresPaciente): DadosDoPaciente {
  const e = v.endereco
  const endereco = {
    cep: digitosOuNull(e.cep),
    logradouro: ouNull(e.logradouro),
    numero: ouNull(e.numero),
    complemento: ouNull(e.complemento),
    bairro: ouNull(e.bairro),
    cidade: ouNull(e.cidade),
    uf: ouNull(e.uf.toUpperCase()),
  }
  const r = v.responsavel
  return {
    nome: v.nome.trim(),
    nomeSocial: ouNull(v.nomeSocial),
    dataNascimento: v.dataNascimento,
    cpf: digitosOuNull(v.cpf),
    celular: somenteDigitos(v.celular),
    email: ouNull(v.email),
    endereco: Object.values(endereco).some((x) => x !== null) ? endereco : null,
    responsavel: r.nome.trim()
      ? {
          nome: r.nome.trim(),
          cpf: digitosOuNull(r.cpf),
          telefone: somenteDigitos(r.telefone),
          parentesco: ouNull(r.parentesco),
        }
      : null,
    observacoes: ouNull(v.observacoes),
  }
}

export function paraValores(p: PacienteResponse): ValoresPaciente {
  return {
    nome: p.nome,
    nomeSocial: p.nomeSocial ?? '',
    dataNascimento: p.dataNascimento,
    cpf: p.cpf ? mascararCpf(p.cpf) : '',
    celular: mascararTelefone(p.celular),
    email: p.email ?? '',
    endereco: {
      cep: p.endereco?.cep ? mascararCep(p.endereco.cep) : '',
      logradouro: p.endereco?.logradouro ?? '',
      numero: p.endereco?.numero ?? '',
      complemento: p.endereco?.complemento ?? '',
      bairro: p.endereco?.bairro ?? '',
      cidade: p.endereco?.cidade ?? '',
      uf: p.endereco?.uf ?? '',
    },
    responsavel: {
      nome: p.responsavel?.nome ?? '',
      cpf: p.responsavel?.cpf ? mascararCpf(p.responsavel.cpf) : '',
      telefone: p.responsavel ? mascararTelefone(p.responsavel.telefone) : '',
      parentesco: p.responsavel?.parentesco ?? '',
    },
    observacoes: p.observacoes ?? '',
  }
}

function hojeIso(): string {
  const hoje = new Date()
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${hoje.getFullYear()}-${doisDigitos(hoje.getMonth() + 1)}-${doisDigitos(hoje.getDate())}`
}
