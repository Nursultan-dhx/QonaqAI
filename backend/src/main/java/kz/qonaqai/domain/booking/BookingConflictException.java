package kz.qonaqai.domain.booking;

public class BookingConflictException extends RuntimeException {
    private final String code;
    public BookingConflictException(String code, String message) { super(message); this.code=code; }
    public String code() { return code; }
}
