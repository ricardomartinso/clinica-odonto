/** Nome social em destaque quando existir, com o nome civil como informação secundária. */
export function NomeDoPaciente({ nome, nomeSocial }: { nome: string; nomeSocial: string | null }) {
  if (!nomeSocial) return <span className="font-medium">{nome}</span>
  return (
    <span>
      <span className="font-medium">{nomeSocial}</span>
      <span className="block text-xs text-muted-foreground">Nome civil: {nome}</span>
    </span>
  )
}
