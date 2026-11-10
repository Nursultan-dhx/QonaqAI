package kz.qonaqai.patterns.observer;
import kz.qonaqai.domain.EventPlan;
public record EventChanged(EventPlan event, boolean created) {}
