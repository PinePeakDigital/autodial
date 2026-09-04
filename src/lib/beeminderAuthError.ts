// Thrown by the beeminder client for a 401/404 response — a permanently
// dead credential (revoked token, deleted/renamed user), as opposed to a
// transient failure.
//
// Only the account-level `getGoals` call is treated as grounds for disabling
// a user (see doCron's per-user catch). A 401/404 from a per-goal `getGoal`
// is deliberately NOT: at that level a 404 far more often means the goal was
// renamed or deleted than that the credential died, and disabling the whole
// account over one goal would be worse than the noise it saves. Per-goal auth
// failures therefore stay generic per-goal errors, and if the credential
// really is dead the next run's `getGoals` catches it anyway.
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
