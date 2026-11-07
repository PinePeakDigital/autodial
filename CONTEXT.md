# Autodialer

Automatically adjusts the rates ("dials") of a Beeminder user's goals based on their recent history, once a day, on the user's behalf.

## Language

### Credentials

**Access token**:
The OAuth credential Beeminder issues to autodialer when a user authorizes it; scoped to that user and revocable per app. The only Beeminder credential autodialer holds.
_Avoid_: token (on its own), API key

**Personal auth token**:
A Beeminder user's account-wide API credential, generated from their account settings. Autodialer never asks for or stores one.
_Avoid_: token (on its own), auth token

### Goals

**Source goal**:
The goal named by another goal's `#autodialFrom` tag. Its recent history, not the goal's own, decides that goal's new rate; the goal's own rate limits still apply.
_Avoid_: from-goal, driver goal
