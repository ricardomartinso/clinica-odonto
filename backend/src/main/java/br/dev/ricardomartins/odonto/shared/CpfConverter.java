package br.dev.ricardomartins.odonto.shared;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
class CpfConverter implements AttributeConverter<Cpf, String> {

    @Override
    public String convertToDatabaseColumn(Cpf cpf) {
        return cpf == null ? null : cpf.digitos();
    }

    @Override
    public Cpf convertToEntityAttribute(String digitos) {
        return digitos == null ? null : new Cpf(digitos);
    }
}
