package kz.qonaqai.web;

import kz.qonaqai.service.ServiceCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ServiceCatalogController {
    private final ServiceCatalog catalog;
    public ServiceCatalogController(ServiceCatalog catalog) { this.catalog = catalog; }

    /** Public reference catalog, matching the existing public venue catalog. */
    @GetMapping("/api/service-options")
    public ServiceCatalog.Options options() { return catalog.options(); }
}
