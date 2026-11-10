package kz.qonaqai.web;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.*;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(kz.qonaqai.domain.pricing.ServiceValidationException.class)
    public ResponseEntity<?> serviceValidation(kz.qonaqai.domain.pricing.ServiceValidationException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage(), "errors", Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException ex) {
        Map<String,String> errors=new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e->errors.putIfAbsent(e.getField(),e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("message","Проверьте заполненные поля","errors",errors));
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException ex) { return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message",Objects.requireNonNullElse(ex.getReason(),"Запрос не выполнен"),"errors",Map.of())); }
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class,ConstraintViolationException.class})
    public ResponseEntity<?> malformed(Exception ex) { return ResponseEntity.badRequest().body(Map.of("message","Проверьте дату, числовые значения и выбранные параметры","errors",Map.of())); }
}
