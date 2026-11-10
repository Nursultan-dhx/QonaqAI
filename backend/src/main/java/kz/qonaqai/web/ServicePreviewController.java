package kz.qonaqai.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.type.LogicalType;
import jakarta.servlet.http.HttpServletRequest;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import kz.qonaqai.service.ServicePreviewService;
import org.springframework.web.bind.annotation.*;

@RestController
public class ServicePreviewController {
    private final ServicePreviewService previews;
    private final AuthSessions sessions;
    private final ObjectReader requests;

    public ServicePreviewController(ServicePreviewService previews, AuthSessions sessions, ObjectMapper mapper) {
        this.previews = previews;
        this.sessions = sessions;
        // Strict only for the new endpoint: preserve existing JSON contracts.
        ObjectMapper strict = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
            DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS, DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        strict.coercionConfigFor(LogicalType.Integer)
            .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
            .setCoercion(CoercionInputShape.String, CoercionAction.Fail)
            .setCoercion(CoercionInputShape.EmptyString, CoercionAction.Fail);
        requests = strict.readerFor(ServicePreviewService.Request.class);
    }

    @PostMapping(path = "/api/events/{eventId}/services/preview", consumes = "application/json")
    public ServicePreviewService.Preview preview(@PathVariable Long eventId, @RequestBody String body,
                                                 HttpServletRequest request) {
        var identity = sessions.require(request);
        try {
            return previews.preview(identity, eventId, requests.readValue(body));
        } catch (JsonProcessingException ex) {
            throw new ServiceValidationException(
                "Проверьте services: допустимы только type и целые hours; цены, гости и другие поля не принимаются");
        }
    }
}
