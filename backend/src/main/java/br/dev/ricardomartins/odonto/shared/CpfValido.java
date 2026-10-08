package br.dev.ricardomartins.odonto.shared;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.RECORD_COMPONENT;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/** CPF com 11 dígitos (sem máscara) e dígitos verificadores corretos. {@code null} é considerado válido. */
@Documented
@Constraint(validatedBy = CpfValido.Validador.class)
@Target({FIELD, PARAMETER, RECORD_COMPONENT})
@Retention(RUNTIME)
public @interface CpfValido {

    String message() default "deve ser um CPF válido com 11 dígitos, sem pontuação";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validador implements ConstraintValidator<CpfValido, String> {

        @Override
        public boolean isValid(String valor, ConstraintValidatorContext context) {
            return valor == null || Cpf.valido(valor);
        }
    }
}
