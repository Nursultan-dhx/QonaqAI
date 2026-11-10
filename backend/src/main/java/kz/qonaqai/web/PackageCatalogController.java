package kz.qonaqai.web;

import kz.qonaqai.service.PackageCatalog;
import org.springframework.web.bind.annotation.*;

@RestController
public class PackageCatalogController {
    private final PackageCatalog catalog;
    public PackageCatalogController(PackageCatalog catalog) { this.catalog = catalog; }

    @GetMapping("/api/package-options")
    public PackageCatalog.Options options() { return catalog.options(); }
}
