import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, firebaseAuth, isBrowser } from './firebase';

export type StaffRole = 'manager' | 'staff';

export interface StaffProfile {
  uid: string;
  email: string | null;
  role: StaffRole | null;
  name?: string;
}

// Real staff authentication, backed by Firebase Auth (email + password).
//
// Being signed in is only half the story — which panels an account may open is
// decided by a matching document in the "staff" collection (staff/<uid> with a
// role of 'manager' or 'staff'). The same check is enforced again in the
// Firestore security rules, so a user who edits the page in their browser still
// can't read or write anything their role doesn't allow.
@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly profileSubject = new BehaviorSubject<StaffProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  // Firebase restores an existing session asynchronously on page load, so panels
  // wait for this before deciding whether to show a login form.
  private readonly readySubject = new BehaviorSubject<boolean>(false);
  readonly ready$ = this.readySubject.asObservable();

  constructor() {
    if (!isBrowser()) {
      // Nothing to restore during server-side rendering.
      this.readySubject.next(true);
      return;
    }

    onAuthStateChanged(firebaseAuth(), async (user) => {
      this.profileSubject.next(user ? await this.loadProfile(user) : null);
      this.readySubject.next(true);
    });
  }

  private async loadProfile(user: User): Promise<StaffProfile> {
    let role: StaffRole | null = null;
    let name: string | undefined;

    try {
      const snapshot = await getDoc(doc(db(), 'staff', user.uid));
      if (snapshot.exists()) {
        const data = snapshot.data() as { role?: StaffRole; name?: string };
        role = data.role ?? null;
        name = data.name;
      }
    } catch {
      // No readable staff record means no role, which the panels treat as
      // "signed in, but not allowed in here".
    }

    return { uid: user.uid, email: user.email, role, name };
  }

  async login(email: string, password: string): Promise<StaffProfile> {
    const credential = await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
    const profile = await this.loadProfile(credential.user);
    this.profileSubject.next(profile);
    this.readySubject.next(true);
    return profile;
  }

  async logout(): Promise<void> {
    if (!isBrowser()) {
      return;
    }
    await signOut(firebaseAuth());
    this.profileSubject.next(null);
  }

  get profile(): StaffProfile | null {
    return this.profileSubject.value;
  }

  // The manager is allowed everywhere; waiters only reach the reservations panel.
  hasRole(required: StaffRole): boolean {
    const role = this.profile?.role;
    if (!role) {
      return false;
    }
    return required === 'manager' ? role === 'manager' : true;
  }
}
