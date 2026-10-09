import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PencilIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { PacienteResponse } from '@/api/tipos'
import { ErroDeCarregamento } from '@/components/ErroDeCarregamento'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsuarioLogado } from '@/features/auth/api'
import { AlertasClinicos } from '@/features/pacientes/AlertasClinicos'
import { consultaAnamnese, consultaPaciente, useAlterarStatusPaciente } from '@/features/pacientes/api'
import { NomeDoPaciente } from '@/features/pacientes/NomeDoPaciente'
import {
  formatarData,
  formatarDataHora,
  idadeEm,
  mascararCep,
  mascararCpf,
  mascararTelefone,
} from '@/lib/formatos'

export const Route = createFileRoute('/_app/pacientes/$pacienteId/')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(consultaPaciente(params.pacienteId)),
  errorComponent: ErroDeCarregamento,
  component: DetalheDoPaciente,
})

function DetalheDoPaciente() {
  const { pacienteId } = Route.useParams()
  const { data } = useSuspenseQuery(consultaPaciente(pacienteId))
  const paciente = data.dados
  const usuario = useUsuarioLogado()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl">
            <NomeDoPaciente nome={paciente.nome} nomeSocial={paciente.nomeSocial} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatarData(paciente.dataNascimento)} · {idadeEm(paciente.dataNascimento)} anos{' '}
            {!paciente.ativo && <Badge variant="outline">Inativo</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          {paciente.ativo && (
            <Button variant="outline" asChild>
              <Link to="/pacientes/$pacienteId/editar" params={{ pacienteId }}>
                <PencilIcon />
                Editar
              </Link>
            </Button>
          )}
          <AlterarStatus paciente={paciente} />
        </div>
      </div>

      {usuario.papel === 'DENTISTA' && <ResumoDaAnamnese pacienteId={pacienteId} ativo={paciente.ativo} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <Dados
              itens={[
                ['CPF', paciente.cpf ? mascararCpf(paciente.cpf) : null],
                ['Celular', mascararTelefone(paciente.celular)],
                ['E-mail', paciente.email],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent>
            {paciente.endereco ? (
              <Dados
                itens={[
                  ['CEP', paciente.endereco.cep ? mascararCep(paciente.endereco.cep) : null],
                  [
                    'Logradouro',
                    [paciente.endereco.logradouro, paciente.endereco.numero, paciente.endereco.complemento]
                      .filter(Boolean)
                      .join(', ') || null,
                  ],
                  ['Bairro', paciente.endereco.bairro ?? null],
                  [
                    'Cidade',
                    [paciente.endereco.cidade, paciente.endereco.uf].filter(Boolean).join(' / ') || null,
                  ],
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Não informado.</p>
            )}
          </CardContent>
        </Card>
        {paciente.responsavel && (
          <Card>
            <CardHeader>
              <CardTitle>Responsável legal</CardTitle>
            </CardHeader>
            <CardContent>
              <Dados
                itens={[
                  ['Nome', paciente.responsavel.nome],
                  ['Parentesco', paciente.responsavel.parentesco ?? null],
                  ['CPF', paciente.responsavel.cpf ? mascararCpf(paciente.responsavel.cpf) : null],
                  ['Telefone', mascararTelefone(paciente.responsavel.telefone)],
                ]}
              />
            </CardContent>
          </Card>
        )}
        {paciente.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line">{paciente.observacoes}</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function Dados({ itens }: { itens: [string, string | null][] }) {
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="contents">
          <dt className="text-muted-foreground">{rotulo}</dt>
          <dd>{valor ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function ResumoDaAnamnese({ pacienteId, ativo }: { pacienteId: string; ativo: boolean }) {
  const consulta = useQuery(consultaAnamnese(pacienteId))
  const anamnese = consulta.data?.dados

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anamnese</CardTitle>
        <CardDescription>
          {consulta.isPending
            ? 'Carregando…'
            : anamnese
              ? `Atualizada em ${formatarDataHora(anamnese.atualizadaEm)}`
              : 'Ainda não registrada.'}
        </CardDescription>
        {ativo && !consulta.isPending && (
          <CardAction>
            <Button variant="outline" size="sm" asChild>
              <Link to="/pacientes/$pacienteId/anamnese" params={{ pacienteId }}>
                {anamnese ? 'Atualizar anamnese' : 'Registrar anamnese'}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {consulta.isPending && <Skeleton className="h-6 w-64" />}
        {consulta.isError && (
          <p className="text-sm text-destructive">Não foi possível carregar a anamnese.</p>
        )}
        {anamnese && <AlertasClinicos alertas={anamnese.alertas} />}
      </CardContent>
    </Card>
  )
}

function AlterarStatus({ paciente }: { paciente: PacienteResponse }) {
  const alterar = useAlterarStatusPaciente(paciente.id)
  const acao = paciente.ativo ? 'inativar' : 'reativar'

  const confirmar = async () => {
    try {
      await alterar.mutateAsync(acao)
      toast.success(paciente.ativo ? 'Paciente inativado.' : 'Paciente reativado.')
    } catch {
      toast.error('Não foi possível alterar a situação do paciente.')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={paciente.ativo ? 'outline' : 'default'}>
          {paciente.ativo ? 'Inativar' : 'Reativar'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{paciente.ativo ? 'Inativar paciente?' : 'Reativar paciente?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {paciente.ativo
              ? 'O cadastro deixa de aparecer nas buscas e não poderá ser alterado. Nenhum dado é apagado e é possível reativá-lo depois.'
              : 'O cadastro volta a aparecer nas buscas e poderá ser alterado.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar}>
            {paciente.ativo ? 'Inativar' : 'Reativar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
