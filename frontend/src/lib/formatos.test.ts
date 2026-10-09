import { describe, expect, it } from 'vitest'
import { cpfValido, formatarData, idadeEm, mascararCep, mascararCpf, mascararTelefone } from './formatos'

describe('cpfValido', () => {
  it.each(['10433218100', '104.332.181-00', '96001338914'])('aceita %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true)
  })

  it.each(['10433218101', '11111111111', '1043321810', ''])('recusa %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(false)
  })
})

describe('máscaras', () => {
  it('formata CPF progressivamente', () => {
    expect(mascararCpf('104')).toBe('104')
    expect(mascararCpf('1043321')).toBe('104.332.1')
    expect(mascararCpf('10433218100')).toBe('104.332.181-00')
    expect(mascararCpf('104.332.181-0099')).toBe('104.332.181-00')
  })

  it('formata celular e telefone fixo', () => {
    expect(mascararTelefone('11987654321')).toBe('(11) 98765-4321')
    expect(mascararTelefone('1132654321')).toBe('(11) 3265-4321')
    expect(mascararTelefone('11')).toBe('(11')
  })

  it('formata CEP', () => {
    expect(mascararCep('01310100')).toBe('01310-100')
  })
})

describe('datas', () => {
  it('formata data ISO sem deslocamento de fuso', () => {
    expect(formatarData('1992-08-01')).toBe('01/08/1992')
  })

  it('calcula idade considerando se já fez aniversário no ano', () => {
    const hoje = new Date(2026, 9, 7) // 07/10/2026
    expect(idadeEm('2008-10-07', hoje)).toBe(18)
    expect(idadeEm('2008-10-08', hoje)).toBe(17)
  })
})
