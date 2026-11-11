package kz.qonaqai.patterns.factory;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import org.springframework.stereotype.Component;

@Component
public class ServiceCreatorRegistry {
    private final Map<ServiceType, ServiceCreator> creators;

    public ServiceCreatorRegistry(List<ServiceCreator> creators) {
        var registered = new EnumMap<ServiceType, ServiceCreator>(ServiceType.class);
        for (ServiceCreator creator : creators) {
            if (creator == null || creator.type() == null)
                throw new IllegalArgumentException("Создатель должен объявить тип услуги");
            if (registered.putIfAbsent(creator.type(), creator) != null)
                throw new IllegalArgumentException("Повторный создатель услуги: " + creator.type());
        }
        this.creators = Map.copyOf(registered);
    }

    public ServiceCreator require(ServiceType type) {
        if (type == null) throw new ServiceValidationException("Выберите тип услуги");
        ServiceCreator creator = creators.get(type);
        if (creator == null) throw new ServiceValidationException("Неподдерживаемая услуга: " + type);
        return creator;
    }
}
