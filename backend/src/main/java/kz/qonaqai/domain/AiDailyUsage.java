package kz.qonaqai.domain;
import jakarta.persistence.*;
@Entity
public class AiDailyUsage {
    @Id @Column(length=100) private String id;
    private int requests;
    protected AiDailyUsage() {}
    public AiDailyUsage(String id) { this.id=id; }
    public int requests() { return requests; }
    public void increment() { requests++; }
    public void refund() { if(requests>0) requests--; }
}
