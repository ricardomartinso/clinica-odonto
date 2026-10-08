package br.dev.ricardomartins.odonto.shared;

import java.util.Comparator;
import java.util.List;
import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Padroniza todas as respostas de erro como ProblemDetail (RFC 9457).
 *
 * <p>Regra de privacidade: nenhuma resposta ou log devolve o valor rejeitado de um campo, apenas o nome
 * do campo e a mensagem. Valores podem ser CPF, telefone ou dados de saúde.
 */
@RestControllerAdvice
class TratadorDeErros extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(TratadorDeErros.class);

    record ErroDeCampo(String campo, String mensagem) {
    }

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    ProblemDetail naoEncontrado(RecursoNaoEncontradoException ex) {
        return problema(HttpStatus.NOT_FOUND, "Recurso não encontrado", ex.getMessage());
    }

    @ExceptionHandler(ConflitoException.class)
    ProblemDetail conflito(ConflitoException ex) {
        return problema(HttpStatus.CONFLICT, "Conflito", ex.getMessage());
    }

    @ExceptionHandler(RegraDeNegocioException.class)
    ProblemDetail regraDeNegocio(RegraDeNegocioException ex) {
        return problema(HttpStatus.UNPROCESSABLE_ENTITY, "Regra de negócio violada", ex.getMessage());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail edicaoConcorrente(ObjectOptimisticLockingFailureException ex) {
        return problema(HttpStatus.CONFLICT, "Conflito",
                "O registro foi alterado por outra pessoa. Recarregue e tente novamente.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integridade(DataIntegrityViolationException ex) {
        // A mensagem original do Postgres contém os valores ("Key (cpf)=(...)"): registra só a constraint.
        String constraint = ex.getCause() instanceof ConstraintViolationException cve
                ? cve.getConstraintName() : "desconhecida";
        log.warn("Violação de integridade no banco (constraint: {})", constraint);
        return problema(HttpStatus.CONFLICT, "Conflito", "A operação viola uma restrição de integridade dos dados.");
    }

    /** Lançada por {@code @PreAuthorize}; sem este handler cairia no tratamento genérico como 500. */
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail acessoNegado(AccessDeniedException ex) {
        return problema(HttpStatus.FORBIDDEN, "Acesso negado", "Você não tem permissão para acessar este recurso.");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail erroInesperado(Exception ex) {
        log.error("Erro inesperado", ex);
        return problema(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno", "Ocorreu um erro inesperado.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<ErroDeCampo> erros = ex.getBindingResult().getAllErrors().stream()
                .map(erro -> new ErroDeCampo(
                        erro instanceof FieldError campo ? campo.getField() : erro.getObjectName(),
                        erro.getDefaultMessage()))
                .sorted(Comparator.comparing(ErroDeCampo::campo))
                .toList();
        return ResponseEntity.badRequest().body(dadosInvalidos(erros));
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<ErroDeCampo> erros = ex.getParameterValidationResults().stream()
                .flatMap(resultado -> resultado.getResolvableErrors().stream()
                        .map(erro -> new ErroDeCampo(
                                resultado.getMethodParameter().getParameterName(), erro.getDefaultMessage())))
                .sorted(Comparator.comparing(ErroDeCampo::campo))
                .toList();
        return ResponseEntity.badRequest().body(dadosInvalidos(erros));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return ResponseEntity.badRequest().body(problema(HttpStatus.BAD_REQUEST, "Requisição malformada",
                "O corpo da requisição está ausente ou não pôde ser interpretado."));
    }

    private static ProblemDetail dadosInvalidos(List<ErroDeCampo> erros) {
        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Dados inválidos", "Um ou mais campos são inválidos.");
        problema.setProperty("erros", erros);
        return problema;
    }

    private static ProblemDetail problema(HttpStatus status, String titulo, String detalhe) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(status, detalhe);
        problema.setTitle(titulo);
        return problema;
    }
}
