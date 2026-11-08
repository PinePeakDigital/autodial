// What a failed Beeminder call means, decided once in the client:
// - credential-rejected: Beeminder refused the access token. Any 401, or a
//   404 on an account-level call (`me`, the goals list), where only a dead
//   token or deleted account can be missing.
// - not-found: a 404 on a per-goal call. Usually a renamed or deleted goal,
//   not a dead credential.
// - other: anything else, including a 200 whose body carries `errors`.
export type BeeminderErrorKind = "credential-rejected" | "not-found" | "other";

export class BeeminderError extends Error {
  kind: BeeminderErrorKind;
  status: number;

  constructor(kind: BeeminderErrorKind, status: number, message: string) {
    super(message);
    this.name = "BeeminderError";
    this.kind = kind;
    this.status = status;
    // Restore the prototype chain: with an ES5 build target, extending a
    // built-in like Error breaks `instanceof` without this.
    Object.setPrototypeOf(this, BeeminderError.prototype);
  }
}
