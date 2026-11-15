package kz.qonaqai.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.qonaqai.domain.AccountPlan;
import kz.qonaqai.domain.Venue;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;

@Component
public class CatalogSeeder implements CommandLineRunner {
    private final VenueRepository venues;
    private final AccountRepository accounts;
    private final AccountPlanRepository plans;
    private final ObjectMapper mapper;

    public CatalogSeeder(VenueRepository venues, AccountRepository accounts, AccountPlanRepository plans, ObjectMapper mapper) {
        this.venues = venues;
        this.accounts = accounts;
        this.plans = plans;
        this.mapper = mapper;
    }

    @Override @Transactional public void run(String... args) throws Exception {
        // Idempotent upsert: updating the reference catalog preserves user events.
        try(var stream=new ClassPathResource("catalog.json").getInputStream()) {
            venues.saveAll(Arrays.asList(mapper.readValue(stream, Venue[].class)));
        }

        // Ensure nursultan.dhx@gmail.com is assigned the PRO plan on startup
        accounts.findByEmail("nursultan.dhx@gmail.com").ifPresent(account -> {
            var plan = plans.findById(account.id()).orElseGet(() -> new AccountPlan(account.id(), AccountPlan.Code.PRO));
            plan.change(AccountPlan.Code.PRO);
            plans.saveAndFlush(plan);
        });
    }
}
