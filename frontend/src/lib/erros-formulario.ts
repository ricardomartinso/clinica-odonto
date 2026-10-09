import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/api/cliente'

/**
 * Leva os erros de validação do backend (400, `erros: [{campo, mensagem}]`) para os campos do
 * formulário; os nomes coincidem, inclusive aninhados ("endereco.cep"). Devolve a mensagem geral a
 * exibir, ou null se tudo foi associado a campos.
 */
export function aplicarErrosDaApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(erro instanceof ApiError)) return 'Não foi possível concluir a operação. Tente novamente.'
  const erros = erro.problema.erros
  if (erro.status === 400 && erros?.length) {
    erros.forEach(({ campo, mensagem }) => setError(campo as Path<T>, { message: mensagem }))
    return null
  }
  return erro.message
}
