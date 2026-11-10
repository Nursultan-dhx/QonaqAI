package kz.qonaqai;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.autoconfigure.validation.ValidationConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ValidationClock {
    @Bean ValidationConfigurationCustomizer localDateValidation() {
        return configuration -> configuration.clockProvider(() -> Clock.system(ZoneId.of("Asia/Qyzylorda")));
    }
}
