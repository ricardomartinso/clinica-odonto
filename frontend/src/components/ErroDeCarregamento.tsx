import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { ehErroDaApi } from '@/api/cliente'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ErroDeCarregamento({ error }: ErrorComponentProps) {
  const naoEncontrado = ehErroDaApi(error, 404)
  return (
    <Alert variant="destructive" className="max-w-xl">
      <AlertTitle>{naoEncontrado ? 'Não encontrado' : 'Erro ao carregar'}</AlertTitle>
      <AlertDescription>
        <p>{naoEncontrado ? error.message : 'Não foi possível carregar os dados. Tente novamente.'}</p>
        <Link to="/pacientes" className="underline">
          Voltar para pacientes
        </Link>
      </AlertDescription>
    </Alert>
  )
}
