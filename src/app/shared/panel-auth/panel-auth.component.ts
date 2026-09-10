import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, StaffProfile, StaffRole } from '../../services/auth.service';

// Login gate for the internal panels (menu management, reservations).
//
// This is real authentication now: accounts live in Firebase Auth and no
// password is stored anywhere in this code. Which panel an account may open is
// decided by its staff record — the manager can reach everything, waiters only
// the reservations panel — and the same rule is enforced again in the Firestore
// security rules, so editing the page in a browser gains nothing.
@Component({
  selector: 'app-panel-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-auth.component.html',
  styleUrl: './panel-auth.component.css'
})
export class PanelAuthComponent implements OnInit, OnDestroy {

  @Input() requiredRole: StaffRole = 'staff';
  @Input() panelTitle = 'Staff Login';
  @Input() panelSubtitle = 'Sign in with your staff account to continue.';

  @Output() authenticatedChange = new EventEmitter<boolean>();

  email = '';
  password = '';
  errorMessage = '';
  submitting = false;

  // True until Firebase has finished restoring any existing session, so a
  // signed-in member of staff doesn't see the login form flash on every reload.
  checking = true;

  profile: StaffProfile | null = null;

  private readonly subscriptions = new Subscription();

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.auth.profile$.subscribe(profile => {
        this.profile = profile;
        this.authenticatedChange.emit(this.authenticated);
      })
    );
    this.subscriptions.add(
      this.auth.ready$.subscribe(ready => {
        this.checking = !ready;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get authenticated(): boolean {
    return !!this.profile && this.auth.hasRole(this.requiredRole);
  }

  // Signed in with a valid account that simply isn't allowed in this panel.
  get signedInWithoutAccess(): boolean {
    return !!this.profile && !this.auth.hasRole(this.requiredRole);
  }

  async login(): Promise<void> {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.errorMessage = '';

    try {
      const profile = await this.auth.login(this.email, this.password);

      if (!profile.role) {
        this.errorMessage = 'This account has no staff access yet. Ask the manager to set it up.';
      } else if (!this.auth.hasRole(this.requiredRole)) {
        this.errorMessage = 'This account does not have access to this panel.';
      } else {
        this.password = '';
      }
    } catch (error: any) {
      this.errorMessage = this.describe(error?.code);
    } finally {
      this.submitting = false;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.email = '';
    this.password = '';
    this.errorMessage = '';
  }

  // Firebase's raw error codes aren't much use to a waiter at the till.
  private describe(code: string | undefined): string {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Incorrect email or password.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/network-request-failed':
        return 'No connection. Check your internet and try again.';
      default:
        return 'Could not sign in right now. Please try again.';
    }
  }
}
