package br.dev.ricardomartins.odonto.shared;

import org.hibernate.envers.RevisionListener;

/** Instanciado pelo Envers (não é bean Spring); lê o usuário direto do SecurityContext. */
public class RevisaoListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        Revisao revisao = (Revisao) revisionEntity;
        UsuarioIdentificado.atual().ifPresent(revisao::setUsuarioId);
    }
}
