package kz.qonaqai.domain;

public enum EventType {
    WEDDING("Свадьба / той"), BIRTHDAY("День рождения"), CORPORATE("Корпоратив"),
    CONFERENCE("Конференция"), GRADUATION("Выпускной"), OTHER("Другое");
    public final String label;
    EventType(String label) { this.label = label; }
}
