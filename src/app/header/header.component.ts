import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnDestroy {

  selectedLanguage: string = 'en';
  mobileMenuOpen: boolean = false;
  headerEntered: boolean = false;
  private lockedScrollY = 0;

  constructor(private translateService: TranslateService, private router: Router) {
    this.translateService.setDefaultLang(this.selectedLanguage);
  }

  // Change app language
  swichLanguage(lang: string) {
    this.translateService.use(lang);
    this.selectedLanguage = lang;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.updateBodyScrollLock();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.updateBodyScrollLock();
  }

  // While the mobile nav drawer is open, the page behind it shouldn't scroll —
  // otherwise you can drag/scroll the backdrop and the home page content moves
  // underneath the (fixed) drawer, which looks broken. A plain `overflow: hidden`
  // on the body also snaps the page back to the top the instant it's applied,
  // so instead we pin the body in place at its current scroll offset (the
  // standard scroll-lock technique) and restore that exact offset on close.
  private updateBodyScrollLock(): void {
    if (this.mobileMenuOpen) {
      this.lockedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.lockedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, this.lockedScrollY);
    }
  }

  // Safety net: if this header instance gets destroyed (e.g. navigating to a
  // different page, which re-creates <app-header>) while the drawer was open,
  // make sure we don't leave the body permanently pinned/unscrollable.
  ngOnDestroy(): void {
    if (this.mobileMenuOpen) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, this.lockedScrollY);
    }
  }

  // Once the entrance slide-down animation finishes, drop the lingering `transform`
  // on <header> — a CSS transform (even an identity one left by "forwards") turns the
  // header into the containing block for any position:fixed descendants (our mobile nav
  // drawer and its backdrop), which breaks their full-viewport positioning.
  onHeaderAnimationEnd(): void {
    this.headerEntered = true;
  }

  // Logo: always go to the front page (top of the home page), regardless of
  // where we currently are. Distinct from the "Menu" nav link below, which
  // scrolls down to the menu section instead.
  onLogoClick(event: Event): void {
    event.preventDefault();
    this.closeMobileMenu();
    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.router.navigateByUrl('/');
    }
  }

  // "Menu" nav link: scroll to the menu section on the home page,
  // navigating home first if we're on another page (e.g. the Reserve page).
  onMenuClick(event: Event): void {
    event.preventDefault();
    this.closeMobileMenu();
    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      this.scrollToMenu();
    } else {
      this.router.navigateByUrl('/').then(() => {
        setTimeout(() => this.scrollToMenu(), 300);
      });
    }
  }

  private scrollToMenu(): void {
    const menuSection = document.getElementById('menu');
    menuSection?.scrollIntoView({ behavior: 'smooth' });
  }
}
