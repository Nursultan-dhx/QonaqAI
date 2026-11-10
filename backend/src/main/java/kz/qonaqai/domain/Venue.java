package kz.qonaqai.domain;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Verified venue information. Missing published prices remain null. */
@Entity
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class Venue {
    @Id private Long id;
    private String slug;
    private String name;
    private String hall;
    private String address;
    @Column(length = 2000) private String description;
    @Column(length = 2000) private String imageUrl;
    @ElementCollection(fetch = FetchType.EAGER) @OrderColumn(name="image_order")
    @Column(length = 2000) private List<String> galleryUrls = new ArrayList<>();
    @Column(length = 2000) private String sourceUrl;
    @Column(length = 2000) private String imageSourceUrl;
    private String verifiedAt;
    private int capacity;
    private Integer theaterCapacity;
    private double area;
    private BigDecimal price;
    @ElementCollection(fetch = FetchType.EAGER) @OrderColumn(name="feature_order")
    private List<String> features = new ArrayList<>();
    protected Venue() {}
    public Long id() { return id; }
    public String name() { return name; }
    public String hall() { return hall; }
    public String address() { return address; }
    public int capacity() { return capacity; }
    public BigDecimal price() { return price; }
    public double area() { return area; }
}
