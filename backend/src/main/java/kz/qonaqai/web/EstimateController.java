package kz.qonaqai.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.cfg.*;
import com.fasterxml.jackson.databind.type.LogicalType;
import jakarta.servlet.http.HttpServletRequest;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import kz.qonaqai.service.EstimateService;
import org.springframework.web.bind.annotation.*;

@RestController
public class EstimateController {
    private final EstimateService estimates;
    private final AuthSessions sessions;
    private final ObjectReader requests;

    public EstimateController(EstimateService estimates, AuthSessions sessions, ObjectMapper mapper) {
        this.estimates = estimates;
        this.sessions = sessions;
        var strict = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
            DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS, DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        strict.coercionConfigFor(LogicalType.Integer)
            .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
            .setCoercion(CoercionInputShape.String, CoercionAction.Fail)
            .setCoercion(CoercionInputShape.EmptyString, CoercionAction.Fail);
        requests = strict.readerFor(EstimateService.Request.class);
    }

    @PostMapping(path = "/api/events/{eventId}/estimate/preview", consumes = "application/json")
    public EstimateService.Estimate preview(@PathVariable Long eventId, @RequestBody String body,
                                            HttpServletRequest request) {
        var identity = sessions.require(request);
        try {
            return estimates.preview(identity, eventId, requests.readValue(body));
        } catch (JsonProcessingException ex) {
            throw new ServiceValidationException(
                "Проверьте packageCode и services: допускаются только type и целые hours; цены, бюджет и гости не принимаются");
        }
    }
}
