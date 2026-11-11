package kz.qonaqai.service;

import com.fasterxml.jackson.databind.*;
import java.io.IOException;
import java.util.*;
import kz.qonaqai.domain.PackageCode;
import kz.qonaqai.domain.estimate.PackageDefinition;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class PackageCatalog {
    public record Definition(String catalogVersion, List<PackageDefinition> packages) {}
    public record Options(String catalogVersion, String currency, boolean demoPrices, List<PackageDefinition> packages) {}
    private final Map<PackageCode, PackageDefinition> definitions;
    private final Options options;

    @Autowired
    public PackageCatalog(ObjectMapper mapper, ServiceCatalog services) {
        this(load(mapper), services);
    }

    public PackageCatalog(Definition definition, ServiceCatalog services) {
        if (definition == null || definition.catalogVersion() == null || definition.catalogVersion().isBlank()
                || definition.packages() == null)
            throw new ServiceValidationException("Каталогу пакетов нужны версия и определения");
        var indexed = new EnumMap<PackageCode, PackageDefinition>(PackageCode.class);
        for (PackageDefinition item : definition.packages()) {
            if (item == null || indexed.putIfAbsent(item.packageCode(), item) != null)
                throw new ServiceValidationException("Пустое или повторное определение пакета");
            item.includedServiceTypes().forEach(services::require);
        }
        var missing = EnumSet.allOf(PackageCode.class);
        missing.removeAll(indexed.keySet());
        if (!missing.isEmpty()) throw new ServiceValidationException("В каталоге отсутствуют пакеты: " + missing);
        definitions = Map.copyOf(indexed);
        options = new Options(definition.catalogVersion(), "KZT", true,
            Arrays.stream(PackageCode.values()).map(indexed::get).toList());
    }

    private static Definition load(ObjectMapper mapper) {
        try (var stream = new ClassPathResource("package-rates.json").getInputStream()) {
            return mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS).readValue(stream, Definition.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Не удалось загрузить package-rates.json", ex);
        }
    }

    public PackageDefinition require(PackageCode code) {
        var result = code == null ? null : definitions.get(code);
        if (result == null) throw new ServiceValidationException("Выберите поддерживаемый пакет");
        return result;
    }

    public Options options() { return options; }
}
