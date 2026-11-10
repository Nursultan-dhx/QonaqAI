package kz.qonaqai.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.*;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class ServiceCatalog {
    public record Definition(String catalogVersion, List<ServiceRate> services) {}
    public record Options(String catalogVersion, String currency, boolean demoPrices,
                          int minHours, int maxHours, List<ServiceRate> services) {}

    private final Options options;
    private final Map<ServiceType, ServiceRate> rates;

    @Autowired
    public ServiceCatalog(ObjectMapper mapper) {
        this(load(mapper));
    }

    public ServiceCatalog(Definition definition) {
        if (definition == null || definition.catalogVersion() == null || definition.catalogVersion().isBlank()
                || definition.services() == null)
            throw new ServiceValidationException("Каталогу нужны версия и услуги");
        var indexed = new EnumMap<ServiceType, ServiceRate>(ServiceType.class);
        for (ServiceRate rate : definition.services()) {
            if (rate == null) throw new ServiceValidationException("Пустой тариф в каталоге");
            if (indexed.putIfAbsent(rate.serviceType(), rate) != null)
                throw new ServiceValidationException("Повторный тариф: " + rate.serviceType());
        }
        var missing = EnumSet.allOf(ServiceType.class);
        missing.removeAll(indexed.keySet());
        if (!missing.isEmpty()) throw new ServiceValidationException("В каталоге отсутствуют услуги: " + missing);
        rates = Map.copyOf(indexed);
        options = new Options(definition.catalogVersion(), "KZT", true,
            ServiceSelection.MIN_HOURS, ServiceSelection.MAX_HOURS,
            Arrays.stream(ServiceType.values()).map(indexed::get).toList());
    }

    private static Definition load(ObjectMapper mapper) {
        try (var stream = new ClassPathResource("service-rates.json").getInputStream()) {
            return mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .readValue(stream, Definition.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Не удалось загрузить service-rates.json", ex);
        }
    }

    public Options options() { return options; }

    public ServiceRate require(ServiceType type) {
        ServiceRate rate = type == null ? null : rates.get(type);
        if (rate == null) throw new ServiceValidationException("Тариф услуги не найден: " + type);
        return rate;
    }
}
