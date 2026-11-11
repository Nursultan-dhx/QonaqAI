package kz.qonaqai.patterns.factory;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Stream;
import com.fasterxml.jackson.databind.ObjectMapper;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.creators.*;
import kz.qonaqai.patterns.factory.products.*;
import kz.qonaqai.service.ServiceCatalog;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class FactoryMethodTest {
    private final ServiceCatalog catalog = new ServiceCatalog(new ObjectMapper());
    private final PricingContext context = new PricingContext(12L, 50, "KZT");

    static Stream<Arguments> products() {
        return Stream.of(
            Arguments.of(new HostServiceCreator(), null, HostService.class, "70000.00", 1),
            Arguments.of(new PhotographerServiceCreator(), 3, PhotographerService.class, "75000.00", 3),
            Arguments.of(new DecorationServiceCreator(), null, DecorationService.class, "45000.00", 1),
            Arguments.of(new MusicServiceCreator(), 2, MusicService.class, "40000.00", 2),
            Arguments.of(new CateringServiceCreator(), null, CateringService.class, "400000.00", 50));
    }

    @ParameterizedTest @MethodSource("products")
    void concreteCreatorsProduceValidatedProductsAndCorrectCharges(
            ServiceCreator creator, Integer hours, Class<?> expectedClass, String total, int quantity) {
        var selection = new ServiceSelection(creator.type(), hours);
        var product = creator.create(selection, catalog.require(creator.type()), context);
        assertThat(product).isExactlyInstanceOf(expectedClass);
        assertThat(product.configuration()).isEqualTo(selection);
        assertThat(product.cost()).isEqualTo(new BigDecimal(total));
        assertThat(product.costLine().quantity()).isEqualTo(quantity);
        assertThat(product.costLine().currency()).isEqualTo("KZT");
        assertThat(product.costLine().demoPrice()).isTrue();
    }

    @Test void decimalMoneyIsExactAndNotBinaryFloatingPoint() {
        var rate = new ServiceRate(ServiceType.PHOTOGRAPHY, "Фотограф", "Демо",
            PricingUnit.PER_HOUR, new BigDecimal("0.10"), "KZT", true);
        var product = new PhotographerServiceCreator()
            .create(new ServiceSelection(ServiceType.PHOTOGRAPHY, 3), rate, context);
        assertThat(product.cost()).isEqualTo(new BigDecimal("0.30"));
    }

    static Stream<Arguments> invalidHours() {
        return Stream.of(new PhotographerServiceCreator(), new MusicServiceCreator())
            .flatMap(creator -> Stream.of(null, 0, -1, 13).map(hours -> Arguments.of(creator, hours)));
    }

    @ParameterizedTest @MethodSource("invalidHours")
    void hourlyProductsRejectMissingOrOutOfRangeHours(ServiceCreator creator, Integer hours) {
        assertThatThrownBy(() -> creator.create(new ServiceSelection(creator.type(), hours),
            catalog.require(creator.type()), context))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("от 1 до 12");
    }

    static Stream<Arguments> hourBoundaries() {
        return Stream.of(new PhotographerServiceCreator(), new MusicServiceCreator())
            .flatMap(creator -> Stream.of(1, 12).map(hours -> Arguments.of(creator, hours)));
    }

    @ParameterizedTest @MethodSource("hourBoundaries")
    void hourlyProductsAcceptBothBoundaries(ServiceCreator creator, int hours) {
        var product = creator.create(new ServiceSelection(creator.type(), hours),
            catalog.require(creator.type()), context);
        assertThat(product.costLine().quantity()).isEqualTo(hours);
    }

    @ParameterizedTest @EnumSource(value = ServiceType.class, names = {"HOST", "DECOR", "CATERING"})
    void nonHourlyServicesRejectHours(ServiceType type) {
        var registry = registry();
        assertThatThrownBy(() -> registry.require(type).create(new ServiceSelection(type, 1), catalog.require(type), context))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("не принимает часы");
    }

    @ParameterizedTest @ValueSource(ints = {0, -1, 10001})
    void invalidGuestCountIsRejected(int guests) {
        assertThatThrownBy(() -> new PricingContext(12L, guests, "KZT"))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("гостей");
    }

    @Test void savedEventAndKztAreRequired() {
        assertThatThrownBy(() -> new PricingContext(null, 50, "KZT")).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new PricingContext(0L, 50, "KZT")).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new PricingContext(12L, 50, "USD")).isInstanceOf(ServiceValidationException.class);
    }

    @Test void registryDispatchesAllFiveTypes() {
        for (ServiceType type : ServiceType.values()) assertThat(registry().require(type).type()).isEqualTo(type);
    }

    @Test void registryRejectsDuplicatesAndUnsupportedTypes() {
        assertThatThrownBy(() -> new ServiceCreatorRegistry(List.of(new HostServiceCreator(), new HostServiceCreator())))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Повторный");
        var registry = new ServiceCreatorRegistry(List.of(new HostServiceCreator()));
        assertThatThrownBy(() -> registry.require(ServiceType.MUSIC))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("Неподдерживаемая");
        assertThatThrownBy(() -> registry.require(null)).isInstanceOf(ServiceValidationException.class);
    }

    @Test void sharedWorkflowRejectsMissingAndMismatchedInputs() {
        var creator = new HostServiceCreator();
        assertThatThrownBy(() -> creator.create(null, catalog.require(ServiceType.HOST), context))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> creator.create(new ServiceSelection(null, null), catalog.require(ServiceType.HOST), context))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> creator.create(new ServiceSelection(ServiceType.MUSIC, 1), catalog.require(ServiceType.MUSIC), context))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> creator.create(new ServiceSelection(ServiceType.HOST, null), null, context))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> creator.create(new ServiceSelection(ServiceType.HOST, null), catalog.require(ServiceType.HOST), null))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void registryAcceptsAnAdditionalCreatorWithoutAConstructionSwitch() {
        var customCreator = new ServiceCreator() {
            @Override public ServiceType type() { return ServiceType.DECOR; }
            @Override protected EventServiceProduct createProduct(ServiceSelection selection, ServiceRate rate, PricingContext data) {
                return new DecorationService(selection, rate, data);
            }
        };
        var registry = new ServiceCreatorRegistry(List.of(new HostServiceCreator(), customCreator));
        var product = registry.require(ServiceType.DECOR)
            .create(new ServiceSelection(ServiceType.DECOR, null), catalog.require(ServiceType.DECOR), context);
        assertThat(product.cost()).isEqualTo(new BigDecimal("45000.00"));
    }

    @Test void sharedWorkflowValidatesProductsReturnedByAnExtension() {
        var selection = new ServiceSelection(ServiceType.HOST, null);
        var creator = new ServiceCreator() {
            @Override public ServiceType type() { return ServiceType.HOST; }
            @Override protected EventServiceProduct createProduct(ServiceSelection chosen, ServiceRate rate, PricingContext data) {
                return new EventServiceProduct() {
                    @Override public ServiceType type() { return ServiceType.HOST; }
                    @Override public ServiceSelection configuration() { return chosen; }
                    @Override public void validate() { throw new ServiceValidationException("Недопустимая конфигурация расширения"); }
                    @Override public ServiceCostLine costLine() { throw new AssertionError("Invalid product must not be priced"); }
                };
            }
        };
        assertThatThrownBy(() -> creator.create(selection, catalog.require(ServiceType.HOST), context))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("конфигурация расширения");
    }

    private ServiceCreatorRegistry registry() {
        return new ServiceCreatorRegistry(List.of(new HostServiceCreator(), new PhotographerServiceCreator(),
            new DecorationServiceCreator(), new MusicServiceCreator(), new CateringServiceCreator()));
    }
}
