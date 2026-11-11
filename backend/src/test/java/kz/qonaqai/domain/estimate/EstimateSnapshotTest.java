package kz.qonaqai.domain.estimate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.service.EstimateService;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EstimateSnapshotTest {
    @Test void snapshotsOwnTheirMoneyLinesInputsAndPackageInsteadOfFollowingCurrentConfiguration() {
        var event=mock(EventPlan.class);
        when(event.id()).thenReturn(3L);when(event.date()).thenReturn(LocalDate.of(2030,1,1));
        when(event.guests()).thenReturn(80);when(event.venueId()).thenReturn(1L);
        when(event.budget()).thenReturn(new BigDecimal("2000000"));
        var config=new EventPackageConfiguration(event);
        config.replace(PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2)),Set.of());
        var inputs=EventInputSnapshot.capture(event);
        var lines=List.of(line("VENUE:1",EstimateLine.Category.VENUE,"500000"),
            line("PACKAGE:BASIC",EstimateLine.Category.PACKAGE,"30000"),
            new EstimateLine("SERVICE:PHOTOGRAPHY","Фотограф",EstimateLine.Category.ADDITIONAL_SERVICE,
                PricingUnit.PER_HOUR,2,new BigDecimal("25000"),new BigDecimal("50000"),false,EstimateLine.PriceSource.DEMO,"KZT"));
        var quote=new EstimateService.Estimate(3L,1L,PackageCode.BASIC,"KZT",true,true,"packages-v1","services-v1","venues-v1",
            new BigDecimal("80000.00"),new BigDecimal("500000.00"),new BigDecimal("580000.00"),new BigDecimal("580000.00"),
            new BigDecimal("2000000.00"),new BigDecimal("1420000.00"),new BigDecimal("0.00"),new BigDecimal("29.00"),
            EstimateService.BudgetStatus.WITHIN_BUDGET,lines,inputs.token(),"test-price-token");
        var snapshot=new EventEstimate(config,inputs,quote);
        config.replace(PackageCode.PREMIUM,List.of(),Set.of(ServiceType.HOST,ServiceType.DECOR));
        when(event.guests()).thenReturn(100);
        assertThat(snapshot.revision()).isEqualTo(1);
        assertThat(snapshot.value()).isEqualTo(quote);
        assertThat(snapshot.additionalServicesSubtotal()).isEqualTo(new BigDecimal("50000.00"));
        assertThat(snapshot.inputs().matches(event)).isFalse();
        assertThat(snapshot.inputs().values().guests()).isEqualTo(80);
        assertThat(snapshot.value().lines().stream().map(EstimateLine::total).reduce(BigDecimal.ZERO,BigDecimal::add))
            .isEqualByComparingTo(snapshot.value().totalCost());
        assertThatThrownBy(()->snapshot.value().lines().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
    private EstimateLine line(String code,EstimateLine.Category category,String amount) {
        return new EstimateLine(code,code,category,PricingUnit.FIXED,1,new BigDecimal(amount),new BigDecimal(amount),false,
            EstimateLine.PriceSource.DEMO,"KZT");
    }
}
