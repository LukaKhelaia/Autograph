# Firebase setup for Autograph

The site now stores its menu and reservations in Firebase (Cloud Firestore) and
signs staff in with Firebase Authentication, replacing the mockapi.io demo
backend and the hardcoded panel passwords.

Everything below fits inside Firebase's free **Spark** plan — no card required.

## 1. Install the package

```
npm install firebase
```

## 2. Create the project

1. https://console.firebase.google.com -> **Add project** (Analytics can be skipped).
2. **Build -> Firestore Database -> Create database**, pick a nearby location,
   start in **production mode**.
3. **Build -> Authentication -> Get started**, enable **Email/Password**.

## 3. Add the config

**Project settings** (gear icon) -> **Your apps** -> web (`</>`) -> register the
app -> copy the `firebaseConfig` values into `src/environments/environment.ts`.

These values are not secrets. A Firebase web config is meant to ship in the
browser bundle; the protection comes from the security rules in step 5.

## 4. Create the staff accounts

Being signed in is not enough on its own — an account also needs a role.

1. **Authentication -> Users -> Add user**: create one account for the manager
   and one for the waiters. Copy each account's **User UID**.
2. **Firestore Database -> Start collection**, collection id `staff`.
3. Add one document per account, using the **User UID as the document id**:

   | Document id      | Field  | Type   | Value     |
   |------------------|--------|--------|-----------|
   | *manager's UID*  | role   | string | `manager` |
   | *waiter's UID*   | role   | string | `staff`   |

   (A `name` string field can be added too; it is optional.)

`manager` reaches both panels. `staff` reaches only `/adminpanelss/reservations`.
Roles can only be changed here in the console — the app cannot grant itself access.

## 5. Publish the security rules

**Firestore Database -> Rules**, paste the contents of `firestore.rules` from this
repo, then **Publish**. Without this step the database will reject the app's reads
and writes (production mode denies everything by default).

## 6. Bring the menu across

Already done — the menu was imported into Firestore on 10 Sep 2026, and the
one-time import button has since been removed along with the last reference to the
old mockapi backend. Nothing in the app talks to mockapi any more.

Existing reservations were not imported; they were test bookings, and the new
system also has to create a table-lock document alongside each one.

## How double-booking is prevented now

Each booked table/date/time also writes a document to `tableSlots` whose id is
built from those three values (`2026-09-12_19:30_t4`). A document id can exist
only once, and the reservation plus its lock are written inside a single
Firestore transaction — so if two people submit for the same table at the same
instant, the database itself lets exactly one through and the other gets
"pick another table". This replaces the old best-effort check-and-hope approach,
which could not be made airtight against mockapi.

Cancelling a booking releases the lock so the table can be booked again.

## Known limitation

Reservation records are publicly readable, because the "My Reservations" lookup
runs straight from the browser with no server in between. Writes are locked down
(the public can create a booking and cancel one, and nothing else), but a
determined person could read the reservation list. Closing that properly needs a
server-side function, which requires the Blaze plan (still effectively free at
this volume, but it asks for a card). Worth knowing; note that the old mockapi
setup was fully open for reads *and* writes, so this is already a large step up.
