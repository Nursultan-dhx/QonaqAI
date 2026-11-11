package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.service.BookingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class BookingController {
    private final BookingService bookings;
    private final AuthSessions sessions;
    public BookingController(BookingService bookings, AuthSessions sessions) { this.bookings=bookings; this.sessions=sessions; }
    @GetMapping("/api/venues/{id}/availability")
    public BookingService.Availability availability(@PathVariable Long id,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end, HttpServletRequest request) {
        sessions.require(request);
        return bookings.availability(id,start,end);
    }
    @PostMapping("/api/events/{id}/bookings") @ResponseStatus(HttpStatus.CREATED)
    public BookingService.View confirm(@PathVariable Long id, @RequestBody BookingService.Request body, HttpServletRequest request) {
        return bookings.confirm(sessions.require(request),id,body);
    }
    @GetMapping("/api/bookings")
    public List<BookingService.View> history(HttpServletRequest request) { return bookings.history(sessions.require(request)); }
    @PostMapping("/api/bookings/{id}/cancel")
    public BookingService.View cancel(@PathVariable Long id, HttpServletRequest request) { return bookings.cancel(sessions.require(request),id); }
}
