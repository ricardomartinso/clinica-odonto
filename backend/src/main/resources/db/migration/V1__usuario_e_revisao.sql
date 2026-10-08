-- Usuários do sistema e tabela de revisões do Hibernate Envers.

create table usuario (
    id             uuid primary key,
    nome           varchar(150) not null,
    email          varchar(254) not null,
    senha_hash     varchar(255) not null,
    papel          varchar(20)  not null,
    cro_numero     varchar(10),
    cro_uf         varchar(2),
    ativo          boolean      not null default true,
    versao         bigint       not null,
    criado_em      timestamptz  not null,
    criado_por     uuid references usuario (id),
    atualizado_em  timestamptz  not null,
    atualizado_por uuid references usuario (id),

    constraint ck_usuario_papel check (papel in ('DENTISTA', 'RECEPCAO')),
    constraint ck_usuario_cro_completo check ((cro_numero is null) = (cro_uf is null)),
    constraint ck_usuario_cro_dentista check ((papel = 'DENTISTA') = (cro_numero is not null))
);

create unique index uk_usuario_email on usuario (lower(email));

create table revisao (
    id         bigint generated always as identity primary key,
    momento    timestamptz not null,
    usuario_id uuid references usuario (id)
);
