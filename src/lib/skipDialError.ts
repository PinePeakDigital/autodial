// Thrown by shouldDial() for goals that are expected and normal to skip
// (odometer goals, goals without an explicit end rate, goals ending within
// the akrasia horizon). Callers that report unexpected errors (e.g. to
// Sentry) should treat this as a log-only skip, not a bug.
export class SkipDialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkipDialError";
    // Restore the prototype chain: with an ES5 build target, extending a
    // built-in like Error breaks `instanceof` without this.
    Object.setPrototypeOf(this, SkipDialError.prototype);
  }
}
