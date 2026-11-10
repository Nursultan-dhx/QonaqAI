package kz.qonaqai.patterns.observer;
/** Observer participant: subscribers react without coupling EventService to their behavior. */
public interface EventObserver { void onEventChanged(EventChanged change); }
