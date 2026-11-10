package kz.qonaqai.patterns.decorator;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.*;
import kz.qonaqai.patterns.factory.creators.*;
import kz.qonaqai.patterns.factory.products.HostService;
import kz.qonaqai.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class DecoratorTest {
    private final ServiceCatalog services = new ServiceCatalog(new ObjectMapper());
    private final PackageCatalog packages = new PackageCatalog(new ObjectMapper(), services);
    private final ServiceCreatorRegistry creators = new ServiceCreatorRegistry(List.of(
        new HostServiceCreator(), new PhotographerServiceCreator(), new DecorationServiceCreator(),
        new MusicServiceCreator(), new CateringServiceCreator()));
    private final PackageAssembler assembler = new PackageAssembler(packages, services, creators);
    private final PricingContext context = new PricingContext(3L, 80, "KZT");

    @ParameterizedTest
    @CsvSource({"BASIC,30000.00,0", "STANDARD,95000.00,1", "PREMIUM,185000.00,2"})
    void basePackagesExposeOnlyOneBaseCharge(PackageCode code, String expected, int includedCount) {
        EventPackage component = assembler.assemble(code, List.of(), context);
        assertThat(component.cost()).isEqualTo(new BigDecimal(expected));
        assertThat(component.includedServiceTypes()).hasSize(includedCount);
        assertThat(component.selectedServiceTypes()).isEmpty();
        assertThat(component.lines()).hasSize(1 + includedCount);
        assertThat(component.lines().stream().filter(EstimateLine::included))
            .allMatch(line -> line.total().signum() == 0 && line.unitPrice().signum() == 0);
        assertThat(charged(component.lines())).isEqualByComparingTo(component.cost());
    }

    @Test void includedSetsAreExactlyTheAgreedEntitlements() {
        assertThat(base(PackageCode.BASIC).includedServiceTypes()).isEmpty();
        assertThat(base(PackageCode.STANDARD).includedServiceTypes()).containsExactly(ServiceType.DECOR);
        assertThat(base(PackageCode.PREMIUM).includedServiceTypes()).containsExactlyInAnyOrder(ServiceType.DECOR, ServiceType.HOST);
    }

    static Stream<Arguments> additions() {
        return Stream.of(Arguments.of(ServiceType.HOST, null, "100000.00", HostDecorator.class),
            Arguments.of(ServiceType.PHOTOGRAPHY, 2, "80000.00", PhotographerDecorator.class),
            Arguments.of(ServiceType.DECOR, null, "75000.00", DecorationDecorator.class),
            Arguments.of(ServiceType.MUSIC, 3, "90000.00", MusicDecorator.class),
            Arguments.of(ServiceType.CATERING, null, "670000.00", CateringDecorator.class));
    }

    @ParameterizedTest @MethodSource("additions")
    void everyOptionalServiceIsAnActualDecorator(ServiceType type, Integer hours, String total, Class<?> decorator) {
        EventPackage component = assembler.assemble(PackageCode.BASIC, List.of(new ServiceSelection(type, hours)), context);
        assertThat(component).isExactlyInstanceOf(decorator);
        assertThat(component.cost()).isEqualTo(new BigDecimal(total));
        assertThat(component.selectedServiceTypes()).containsExactly(type);
        assertThat(component.lines()).hasSize(2);
        assertThat(charged(component.lines())).isEqualByComparingTo(component.cost());
        if (type == ServiceType.CATERING) assertThat(component.lines().getLast().quantity()).isEqualTo(80);
    }

    @Test void nestedCostAndLinesTraverseTheWrappedComponent() {
        var costCalls = new AtomicInteger();
        var lineCalls = new AtomicInteger();
        EventPackage base = base(PackageCode.BASIC);
        EventPackage traced = new EventPackage() {
            public BigDecimal cost() { costCalls.incrementAndGet(); return base.cost(); }
            public List<EstimateLine> lines() { lineCalls.incrementAndGet(); return base.lines(); }
            public Set<ServiceType> includedServiceTypes() { return base.includedServiceTypes(); }
            public Set<ServiceType> selectedServiceTypes() { return base.selectedServiceTypes(); }
        };
        EventPackage nested = new PhotographerDecorator(new MusicDecorator(traced, product(ServiceType.MUSIC, 3)),
            product(ServiceType.PHOTOGRAPHY, 2));
        assertThat(nested.cost()).isEqualTo(new BigDecimal("140000.00"));
        assertThat(nested.lines()).extracting(EstimateLine::code)
            .containsExactly("PACKAGE:BASIC", "SERVICE:MUSIC", "SERVICE:PHOTOGRAPHY");
        assertThat(costCalls.get()).isEqualTo(1);
        assertThat(lineCalls.get()).isEqualTo(1);
        assertThat(nested.selectedServiceTypes()).containsExactlyInAnyOrder(ServiceType.PHOTOGRAPHY, ServiceType.MUSIC);
    }

    @Test void additiveDecoratorOrderDoesNotChangeCost() {
        EventPackage first = new MusicDecorator(new PhotographerDecorator(base(PackageCode.BASIC),
            product(ServiceType.PHOTOGRAPHY, 2)), product(ServiceType.MUSIC, 3));
        EventPackage second = new PhotographerDecorator(new MusicDecorator(base(PackageCode.BASIC),
            product(ServiceType.MUSIC, 3)), product(ServiceType.PHOTOGRAPHY, 2));
        assertThat(first.cost()).isEqualTo(second.cost());
        assertThat(charged(first.lines())).isEqualByComparingTo(first.cost());
        assertThat(charged(second.lines())).isEqualByComparingTo(second.cost());
    }

    @Test void rebuildingWithoutASelectionRemovesExactlyItsCharge() {
        var host = new ServiceSelection(ServiceType.HOST, null);
        var photo = new ServiceSelection(ServiceType.PHOTOGRAPHY, 2);
        EventPackage both = assembler.assemble(PackageCode.BASIC, List.of(host, photo), context);
        EventPackage removed = assembler.assemble(PackageCode.BASIC, List.of(photo), context);
        assertThat(both.cost().subtract(removed.cost())).isEqualTo(new BigDecimal("70000.00"));
        assertThat(removed.lines()).noneMatch(line -> line.code().equals("SERVICE:HOST"));
    }

    @Test void decoratorsRejectDuplicatesAndIncludedTypesEvenWithoutTheAssembler() {
        var host = product(ServiceType.HOST, null);
        assertThatThrownBy(() -> new HostDecorator(new HostDecorator(base(PackageCode.BASIC), host), host))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("повторно");
        assertThatThrownBy(() -> new HostDecorator(base(PackageCode.PREMIUM), host))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("включена");
        assertThatThrownBy(() -> new DecorationDecorator(base(PackageCode.STANDARD), product(ServiceType.DECOR, null)))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("включена");
        assertThatThrownBy(() -> new HostDecorator(base(PackageCode.BASIC), product(ServiceType.MUSIC, 1)))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void assemblerRejectsNullDuplicateAndIncludedSelections() {
        assertThatThrownBy(() -> assembler.assemble(null, List.of(), context)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> assembler.assemble(PackageCode.BASIC, null, context)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> assembler.assemble(PackageCode.BASIC, Arrays.asList((ServiceSelection) null), context))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> assembler.assemble(PackageCode.BASIC, List.of(new ServiceSelection(null, null)), context))
            .isInstanceOf(ServiceValidationException.class);
        var decor = new ServiceSelection(ServiceType.DECOR, null);
        assertThatThrownBy(() -> assembler.assemble(PackageCode.BASIC, List.of(decor, decor), context))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("повторно");
        assertThatThrownBy(() -> assembler.assemble(PackageCode.STANDARD, List.of(decor), context))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("включена");
    }

    @Test void immutableComponentOutputsAndMatchingDefinitionsAreEnforced() {
        var component = assembler.assemble(PackageCode.BASIC, List.of(new ServiceSelection(ServiceType.HOST, null)), context);
        assertThatThrownBy(() -> component.lines().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> component.selectedServiceTypes().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> new BasicPackage(packages.require(PackageCode.STANDARD), services))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void assemblerReusesInjectedFactoryMethodProducts() {
        var calls = new ArrayList<ServiceSelection>();
        var creator = new ServiceCreator() {
            @Override public ServiceType type() { return ServiceType.HOST; }
            @Override protected EventServiceProduct createProduct(ServiceSelection selection, ServiceRate rate, PricingContext context) {
                calls.add(selection);
                return new HostService(selection, rate, context);
            }
        };
        var assembler = new PackageAssembler(packages, services, new ServiceCreatorRegistry(List.of(creator)));
        EventPackage component = assembler.assemble(PackageCode.BASIC, List.of(new ServiceSelection(ServiceType.HOST, null)), context);
        assertThat(component).isInstanceOf(HostDecorator.class);
        assertThat(component.cost()).isEqualTo(new BigDecimal("100000.00"));
        assertThat(calls).containsExactly(new ServiceSelection(ServiceType.HOST, null));
    }

    private EventPackage base(PackageCode code) { return assembler.assemble(code, List.of(), context); }
    private EventServiceProduct product(ServiceType type, Integer hours) {
        return creators.require(type).create(new ServiceSelection(type, hours), services.require(type), context);
    }
    private BigDecimal charged(List<EstimateLine> lines) {
        return lines.stream().map(EstimateLine::total).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
