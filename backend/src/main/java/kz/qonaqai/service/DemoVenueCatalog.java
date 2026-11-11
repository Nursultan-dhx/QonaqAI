package kz.qonaqai.service;

import com.fasterxml.jackson.databind.*;
import java.io.IOException;
import java.util.*;
import kz.qonaqai.domain.estimate.DemoVenueRate;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/** Fictional tariffs by stable venue ID; never writes to the factual Venue catalog. */
@Service
public class DemoVenueCatalog {
    public record Definition(String catalogVersion, List<DemoVenueRate> rates) {}
    private final String catalogVersion;
    private final Map<Long, DemoVenueRate> rates;

    @Autowired
    public DemoVenueCatalog(ObjectMapper mapper) { this(load(mapper)); }

    public DemoVenueCatalog(Definition definition) {
        if (definition == null || definition.catalogVersion() == null || definition.catalogVersion().isBlank()
                || definition.rates() == null)
            throw new ServiceValidationException("Каталогу DEMO-аренды нужны версия и определения");
        var indexed = new HashMap<Long, DemoVenueRate>();
        for (DemoVenueRate rate : definition.rates()) {
            if (rate == null || indexed.putIfAbsent(rate.venueId(), rate) != null)
                throw new ServiceValidationException("Пустой или повторный DEMO-тариф площадки");
        }
        catalogVersion = definition.catalogVersion();
        rates = Map.copyOf(indexed);
    }

    private static Definition load(ObjectMapper mapper) {
        try (var stream = new ClassPathResource("demo-venue-rates.json").getInputStream()) {
            return mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS).readValue(stream, Definition.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Не удалось загрузить demo-venue-rates.json", ex);
        }
    }

    public String catalogVersion() { return catalogVersion; }
    /** An absent definition is explicit uncertainty, not a zero-price fallback. */
    public Optional<DemoVenueRate> find(Long venueId) { return Optional.ofNullable(rates.get(venueId)); }
}
