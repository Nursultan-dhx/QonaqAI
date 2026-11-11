package kz.qonaqai.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.cfg.*;
import com.fasterxml.jackson.databind.type.LogicalType;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import kz.qonaqai.service.PackageConfigurationService;
import org.springframework.web.bind.annotation.*;

@RestController
public class PackageConfigurationController {
    private final PackageConfigurationService packages;
    private final AuthSessions sessions;
    private final ObjectReader requests;
    public PackageConfigurationController(PackageConfigurationService packages,AuthSessions sessions,ObjectMapper mapper) {
        this.packages=packages; this.sessions=sessions;
        var strict=mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
            DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS,DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        strict.coercionConfigFor(LogicalType.Integer)
            .setCoercion(CoercionInputShape.Float,CoercionAction.Fail)
            .setCoercion(CoercionInputShape.String,CoercionAction.Fail)
            .setCoercion(CoercionInputShape.EmptyString,CoercionAction.Fail);
        requests=strict.readerFor(PackageConfigurationService.SaveRequest.class);
    }
    @GetMapping("/api/events/{eventId}/package")
    public PackageConfigurationService.SavedPackage load(@PathVariable Long eventId,HttpServletRequest request) {
        return packages.load(sessions.require(request),eventId);
    }
    @PutMapping(path="/api/events/{eventId}/package",consumes="application/json")
    public PackageConfigurationService.SavedPackage save(@PathVariable Long eventId,@RequestBody String body,HttpServletRequest request) {
        var identity=sessions.require(request);
        try { return packages.save(identity,eventId,requests.readValue(body)); }
        catch(JsonProcessingException ex) {
            throw new ServiceValidationException("Проверьте пакет, services, версии и отпечатки расчёта. Цены и другие лишние поля не принимаются.");
        }
    }
    @GetMapping("/api/events/{eventId}/package/estimates")
    public List<PackageConfigurationService.SavedQuote> history(@PathVariable Long eventId,HttpServletRequest request) {
        return packages.history(sessions.require(request),eventId);
    }
}
