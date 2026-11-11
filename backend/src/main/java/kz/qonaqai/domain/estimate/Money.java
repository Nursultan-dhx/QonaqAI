package kz.qonaqai.domain.estimate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import kz.qonaqai.domain.pricing.ServiceValidationException;

/** Exact KZT amounts, bounded to DECIMAL(16,2), matching the event money convention. */
public final class Money {
    private static final BigDecimal MAX = new BigDecimal("99999999999999.99");
    private Money() {}

    public static BigDecimal amount(BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(MAX) > 0)
            throw new ServiceValidationException("Сумма должна быть от 0 до 99999999999999.99 KZT");
        try {
            return value.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new ServiceValidationException("В сумме допускается не более двух знаков после запятой");
        }
    }

    public static BigDecimal positive(BigDecimal value) {
        BigDecimal result = amount(value);
        if (result.signum() == 0) throw new ServiceValidationException("Тариф или бюджет должен быть больше нуля");
        return result;
    }
}
