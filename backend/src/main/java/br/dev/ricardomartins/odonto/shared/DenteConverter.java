package br.dev.ricardomartins.odonto.shared;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
class DenteConverter implements AttributeConverter<Dente, Short> {

    @Override
    public Short convertToDatabaseColumn(Dente dente) {
        return dente == null ? null : (short) dente.codigo();
    }

    @Override
    public Dente convertToEntityAttribute(Short codigo) {
        return codigo == null ? null : new Dente(codigo);
    }
}
