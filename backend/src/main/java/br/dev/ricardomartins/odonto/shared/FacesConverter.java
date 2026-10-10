package br.dev.ricardomartins.odonto.shared;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Sem faces = NULL no banco (procedimentos de dente inteiro, arcada ou boca). */
@Converter(autoApply = true)
class FacesConverter implements AttributeConverter<Faces, String> {

    @Override
    public String convertToDatabaseColumn(Faces faces) {
        return faces == null || faces.vazio() ? null : faces.serializar();
    }

    @Override
    public Faces convertToEntityAttribute(String valor) {
        return Faces.desserializar(valor);
    }
}
