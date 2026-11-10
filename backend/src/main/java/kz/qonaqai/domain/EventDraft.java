package kz.qonaqai.domain;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record EventDraft(
    @NotBlank(message="Введите название мероприятия") @Size(max=120, message="Не более 120 символов") String title,
    @NotNull(message="Выберите тип мероприятия") EventType type,
    @NotNull(message="Выберите дату") @FutureOrPresent(message="Дата не может быть в прошлом") LocalDate date,
    @Min(value=1, message="Минимум один гость") @Max(value=10000, message="Не более 10 000 гостей") int guests,
    @NotNull(message="Укажите бюджет") @DecimalMin(value="1", message="Бюджет должен быть больше нуля")
    @DecimalMax(value="1000000000", message="Бюджет не более 1 млрд ₸") @Digits(integer=10,fraction=2,message="Не более двух знаков после запятой") BigDecimal budget,
    @Size(max=2000,message="Описание не более 2000 символов") String description,
    @NotNull(message="Выберите способ подбора") StrategyId strategy,
    Long venueId
) {}
