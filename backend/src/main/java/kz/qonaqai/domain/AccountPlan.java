package kz.qonaqai.domain;

import jakarta.persistence.*;

@Entity
public class AccountPlan {
    public enum Code { FREE, PRO }
    @Id private Long accountId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=10) private Code code;
    protected AccountPlan() {}
    public AccountPlan(Long accountId, Code code) { this.accountId=accountId; this.code=code; }
    public Code code() { return code; }
    public void change(Code code) { this.code=code; }
}
