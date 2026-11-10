package kz.qonaqai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.*;
import kz.qonaqai.patterns.factory.creators.*;
import kz.qonaqai.patterns.factory.products.*;
import kz.qonaqai.persistence.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ServicePreviewServiceTest {
    private final EventRepository events = mock(EventRepository.class);
    private final ServiceCatalog catalog = new ServiceCatalog(new ObjectMapper());
    private final SessionIdentity owner = new SessionIdentity(7L, "Тест");

    @BeforeEach void savedEvent() {
        var event = mock(EventPlan.class);
        when(event.id()).thenReturn(12L);
        when(event.guests()).thenReturn(50);
        when(events.findByIdAndOwnerId(12L, 7L)).thenReturn(Optional.of(event));
    }

    @Test void subtotalEqualsItemizedChargesWithAuthoritativeGuestCount() {
        var service = new ServicePreviewService(events, catalog, new ServiceCreatorRegistry(
            List.of(new PhotographerServiceCreator(), new CateringServiceCreator())));
        var preview = service.preview(owner, 12L, new ServicePreviewService.Request(List.of(
            new ServiceSelection(ServiceType.PHOTOGRAPHY, 3), new ServiceSelection(ServiceType.CATERING, null))));
        assertThat(preview.servicesSubtotal()).isEqualTo(new BigDecimal("475000.00"));
        assertThat(preview.lines().stream().map(ServiceCostLine::total).reduce(BigDecimal.ZERO, BigDecimal::add))
            .isEqualByComparingTo(preview.servicesSubtotal());
        assertThat(preview.lines().get(1).quantity()).isEqualTo(50);
        verify(events, never()).save(any());
        assertThatThrownBy(() -> preview.lines().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test void productionServiceInvokesTheOverriddenFactoryMethod() {
        var calls = new ArrayList<ServiceSelection>();
        var creator = new ServiceCreator() {
            @Override public ServiceType type() { return ServiceType.HOST; }
            @Override protected EventServiceProduct createProduct(ServiceSelection selection, ServiceRate rate, PricingContext context) {
                calls.add(selection);
                return new HostService(selection, rate, context);
            }
        };
        var service = new ServicePreviewService(events, catalog, new ServiceCreatorRegistry(List.of(creator)));
        var selection = new ServiceSelection(ServiceType.HOST, null);
        var result = service.preview(owner, 12L, new ServicePreviewService.Request(List.of(selection)));
        assertThat(calls).containsExactly(selection);
        assertThat(result.servicesSubtotal()).isEqualTo(new BigDecimal("70000.00"));
    }

    @Test void duplicatesAreRejectedInsteadOfChargedOrDiscarded() {
        var service = new ServicePreviewService(events, catalog, new ServiceCreatorRegistry(List.of()));
        var selection = new ServiceSelection(ServiceType.HOST, null);
        assertThatThrownBy(() -> service.preview(owner, 12L,
            new ServicePreviewService.Request(List.of(selection, selection))))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("повторно");
    }

    @Test void missingListAndNullSelectionAreRejected() {
        var service = new ServicePreviewService(events, catalog, new ServiceCreatorRegistry(List.of()));
        assertThatThrownBy(() -> service.preview(owner, 12L, null)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> service.preview(owner, 12L, new ServicePreviewService.Request(null)))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> service.preview(owner, 12L, new ServicePreviewService.Request(Arrays.asList((ServiceSelection) null))))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void emptySelectionHasZeroSubtotal() {
        var service = new ServicePreviewService(events, catalog, new ServiceCreatorRegistry(List.of()));
        assertThat(service.preview(owner, 12L, new ServicePreviewService.Request(List.of())).servicesSubtotal())
            .isEqualTo(new BigDecimal("0.00"));
    }
}
