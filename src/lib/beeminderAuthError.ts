// Thrown by the beeminder client for a 401/404 response — a permanently
// dead credential (revoked token, deleted/renamed user), as opposed to a
// transient failure. Callers can catch this to disable the user instead of
// retrying forever and paging on every cron tick.
export class BeeminderAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BeeminderAuthError";
    this.status = status;
    // Restore the prototype chain: with an ES5 build target, extending a
    // built-in like Error breaks `instanceof` without this.
    Object.setPrototypeOf(this, BeeminderAuthError.prototype);
  }
}
