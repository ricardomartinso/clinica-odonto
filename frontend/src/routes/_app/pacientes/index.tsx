import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { consultaPacientes } from '@/features/pacientes/api'
import { NomeDoPaciente } from '@/features/pacientes/NomeDoPaciente'
import { formatarData, idadeEm } from '@/lib/formatos'

/** Filtros na URL: a busca pode ser compartilhada, recarregada e navegada com voltar/avançar. */
const filtros = z.object({
  busca: z.string().optional().catch(undefined),
  pagina: z.number().int().min(0).optional().catch(undefined),
  inativos: z.boolean().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/pacientes/')({
  validateSearch: filtros,
  component: ListaDePacientes,
})

function ListaDePacientes() {
  const { busca, pagina = 0, inativos = false } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const consulta = useQuery(consultaPacientes({ busca, pagina, incluirInativos: inativos }))

  const [termo, setTermo] = useState(busca ?? '')
  useEffect(() => {
    const atraso = setTimeout(() => {
      const novaBusca = termo.trim() || undefined
      if (novaBusca !== busca) {
        void navigate({ search: (s) => ({ ...s, busca: novaBusca, pagina: undefined }), replace: true })
      }
    }, 300)
    return () => clearTimeout(atraso)
  }, [termo, busca, navigate])

  const resultado = consulta.data
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <Button asChild>
          <Link to="/pacientes/novo">
            <PlusIcon />
            Novo paciente
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar por nome ou CPF"
            placeholder="Buscar por nome ou CPF"
            className="pl-8"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={inativos}
            onChange={(e) =>
              void navigate({
                search: (s) => ({ ...s, inativos: e.target.checked || undefined, pagina: undefined }),
              })
            }
          />
          Incluir inativos
        </label>
      </div>

      {consulta.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Não foi possível carregar os pacientes.</AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nascimento</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!resultado &&
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {resultado?.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum paciente encontrado.
                  </TableCell>
                </TableRow>
              )}
              {resultado?.content.map((paciente) => (
                <TableRow key={paciente.id}>
                  <TableCell>
                    <Link
                      to="/pacientes/$pacienteId"
                      params={{ pacienteId: paciente.id }}
                      className="hover:underline"
                    >
                      <NomeDoPaciente nome={paciente.nome} nomeSocial={paciente.nomeSocial} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatarData(paciente.dataNascimento)}{' '}
                    <span className="text-muted-foreground">({idadeEm(paciente.dataNascimento)} anos)</span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{paciente.cpfMascarado ?? '—'}</TableCell>
                  <TableCell>
                    {paciente.ativo ? (
                      <Badge variant="secondary">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {resultado && resultado.page.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {resultado.page.number + 1} de {resultado.page.totalPages} · {resultado.page.totalElements}{' '}
            pacientes
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina === 0}
            onClick={() => void navigate({ search: (s) => ({ ...s, pagina: pagina - 1 || undefined }) })}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina + 1 >= resultado.page.totalPages}
            onClick={() => void navigate({ search: (s) => ({ ...s, pagina: pagina + 1 }) })}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
