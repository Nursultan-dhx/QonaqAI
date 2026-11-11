package kz.qonaqai.domain.estimate;

public class PackageConflictException extends RuntimeException {
    private final String code;
    public PackageConflictException(String code,String message) { super(message); this.code=code; }
    public String code() { return code; }
}
