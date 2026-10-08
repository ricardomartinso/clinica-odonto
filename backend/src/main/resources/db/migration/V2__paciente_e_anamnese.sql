-- Cadastro de pacientes e anamnese (auditada pelo Envers).

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- unaccent() é STABLE (depende do search_path); com dicionário explícito podemos declarar IMMUTABLE,
-- requisito para usá-la em coluna gerada e índice.
create function immutable_unaccent(text) returns text
    language sql immutable parallel safe strict
as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

create table paciente (
    id                    uuid primary key,
    nome                  varchar(150)  not null,
    nome_social           varchar(150),
    data_nascimento       date          not null,
    cpf                   varchar(11),
    celular               varchar(11)   not null,
    email                 varchar(254),
    endereco_cep          varchar(8),
    endereco_logradouro   varchar(150),
    endereco_numero       varchar(20),
    endereco_complemento  varchar(100),
    endereco_bairro       varchar(100),
    endereco_cidade       varchar(100),
    endereco_uf           varchar(2),
    responsavel_nome      varchar(150),
    responsavel_cpf       varchar(11),
    responsavel_telefone  varchar(11),
    responsavel_parentesco varchar(50),
    observacoes           varchar(2000),
    ativo                 boolean       not null default true,
    -- Nome + nome social, minúsculo e sem acento: "jose" encontra "José".
    nome_busca            text generated always as (
                              immutable_unaccent(lower(nome || ' ' || coalesce(nome_social, '')))
                          ) stored,
    versao                bigint        not null,
    criado_em             timestamptz   not null,
    criado_por            uuid references usuario (id),
    atualizado_em         timestamptz   not null,
    atualizado_por        uuid references usuario (id),

    constraint ck_paciente_cpf check (cpf ~ '^[0-9]{11}$'),
    constraint ck_paciente_celular check (celular ~ '^[0-9]{10,11}$'),
    constraint ck_paciente_cep check (endereco_cep ~ '^[0-9]{8}$'),
    constraint ck_paciente_uf check (endereco_uf ~ '^[A-Z]{2}$'),
    constraint ck_paciente_responsavel_cpf check (responsavel_cpf ~ '^[0-9]{11}$'),
    constraint ck_paciente_responsavel_telefone check (responsavel_telefone ~ '^[0-9]{10,11}$'),
    constraint ck_paciente_responsavel_completo check (
        (responsavel_nome is null) = (responsavel_telefone is null)
        and (responsavel_nome is not null or (responsavel_cpf is null and responsavel_parentesco is null))
    )
);

-- CPF é opcional, mas único quando informado.
create unique index uk_paciente_cpf on paciente (cpf) where cpf is not null;
create index ix_paciente_nome_busca on paciente using gin (nome_busca gin_trgm_ops);

-- Anamnese 1:1 com o paciente. Booleanos anuláveis: null = "não perguntado", diferente de "não".
create table anamnese (
    paciente_id          uuid primary key references paciente (id),
    alergico             boolean,
    alergias_descricao   varchar(500),
    usa_anticoagulante   boolean,
    diabetes             boolean,
    hipertensao          boolean,
    cardiopatia          boolean,
    coagulopatia         boolean,
    gestante             boolean,
    semanas_gestacao     integer,
    fumante              boolean,
    usa_bisfosfonatos    boolean,
    reacao_anestesia     boolean,
    medicamentos_em_uso  varchar(1000),
    observacoes          varchar(2000),
    versao               bigint      not null,
    criado_em            timestamptz not null,
    criado_por           uuid references usuario (id),
    atualizado_em        timestamptz not null,
    atualizado_por       uuid references usuario (id),

    constraint ck_anamnese_alergia check (alergico is not true or alergias_descricao is not null),
    constraint ck_anamnese_gestacao check (
        (gestante is true) = (semanas_gestacao is not null)
        and (semanas_gestacao is null or semanas_gestacao between 1 and 42)
    )
);

-- Histórico gerado pelo Envers: uma linha por revisão (revtype 0 = inclusão, 1 = alteração, 2 = remoção).
create table anamnese_aud (
    paciente_id          uuid     not null,
    rev                  bigint   not null references revisao (id),
    revtype              smallint not null,
    alergico             boolean,
    alergias_descricao   varchar(500),
    usa_anticoagulante   boolean,
    diabetes             boolean,
    hipertensao          boolean,
    cardiopatia          boolean,
    coagulopatia         boolean,
    gestante             boolean,
    semanas_gestacao     integer,
    fumante              boolean,
    usa_bisfosfonatos    boolean,
    reacao_anestesia     boolean,
    medicamentos_em_uso  varchar(1000),
    observacoes          varchar(2000),
    primary key (paciente_id, rev)
);
