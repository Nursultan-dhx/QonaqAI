package kz.qonaqai.domain.estimate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SavedConfigurationTest {
    private final EventPlan event=mock(EventPlan.class);
    private EventPackageConfiguration configuration() {
        when(event.id()).thenReturn(3L);
        return new EventPackageConfiguration(event);
    }
    @Test void configurationReplacementReconcilesTypedSelectionsAndRevisions() {
        var c=configuration();
        c.replace(PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2)),Set.of());
        assertThat(c.revision()).isEqualTo(1);
        c.replace(PackageCode.STANDARD,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,3),new ServiceSelection(ServiceType.CATERING,null)),Set.of(ServiceType.DECOR));
        assertThat(c.packageCode()).isEqualTo(PackageCode.STANDARD);
        assertThat(c.revision()).isEqualTo(2);
        assertThat(c.selections()).contains(new ServiceSelection(ServiceType.PHOTOGRAPHY,3));
        c.replace(PackageCode.PREMIUM,List.of(),Set.of(ServiceType.DECOR,ServiceType.HOST));
        assertThat(c.selections()).isEmpty();
        assertThat(c.revision()).isEqualTo(3);
    }
    @ParameterizedTest @ValueSource(ints={0,-1,13})
    void invalidHourlySelectionsDoNotChangeThePreviousConfiguration(int hours) {
        var c=configuration();
        c.replace(PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2)),Set.of());
        assertThatThrownBy(()->c.replace(PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,hours)),Set.of()))
            .isInstanceOf(ServiceValidationException.class);
        assertThat(c.revision()).isEqualTo(1);
        assertThat(c.selections()).containsExactly(new ServiceSelection(ServiceType.PHOTOGRAPHY,2));
    }
    @Test void duplicatesIncludedAndStaleVersionsAreRejected() {
        var c=configuration();var host=new ServiceSelection(ServiceType.HOST,null);
        assertThatThrownBy(()->c.replace(PackageCode.BASIC,List.of(host,host),Set.of())).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(()->c.replace(PackageCode.PREMIUM,List.of(host),Set.of(ServiceType.HOST))).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(()->c.requireVersion(2L)).isInstanceOf(PackageConflictException.class);
    }
    @Test void freshnessUsesValuesAndIgnoresDecimalScale() {
        when(event.date()).thenReturn(LocalDate.of(2030,1,2));
        when(event.guests()).thenReturn(80);when(event.venueId()).thenReturn(1L);
        when(event.budget()).thenReturn(new BigDecimal("2000000.00"));
        var input=EventInputSnapshot.capture(event);
        when(event.budget()).thenReturn(new BigDecimal("2000000"));
        assertThat(input.matches(event)).isTrue();
        when(event.guests()).thenReturn(90);
        assertThat(input.matches(event)).isFalse();
        assertThat(input.values().guests()).isEqualTo(80);
        assertThat(input.values().budget()).isEqualTo(new BigDecimal("2000000.00"));
    }
}
