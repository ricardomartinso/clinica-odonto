package br.dev.ricardomartins.odonto.shared;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.RECORD_COMPONENT;
import static java.lang.annotation.ElementType.TYPE_USE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/** Código de dente na notação FDI (11–48 permanentes, 51–85 decíduos). {@code null} é considerado válido. */
@Documented
@Constraint(validatedBy = DenteValido.Validador.class)
@Target({FIELD, PARAMETER, RECORD_COMPONENT, TYPE_USE})
@Retention(RUNTIME)
public @interface DenteValido {

    String message() default "deve ser um dente válido na notação FDI (11–48 ou 51–85)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validador implements ConstraintValidator<DenteValido, Integer> {

        @Override
        public boolean isValid(Integer codigo, ConstraintValidatorContext context) {
            return codigo == null || Dente.valido(codigo);
        }
    }
}
