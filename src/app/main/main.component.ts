import { AfterViewInit, Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, NgClass, NgFor } from '@angular/common';
import { MenuItem } from '../services/menu.model';
import { MenuService } from '../services/menu.service';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';
import { RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [NgClass, NgFor,CommonModule,RouterModule,HeaderComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css',
    animations: [
    trigger('menuAnimation', [
  transition(':enter', [
    query('.menu-card', [
      style({ opacity: 0, transform: 'scale(0.5)' }),
      stagger(20, [
        animate('300ms ease', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ], { optional: true })
  ]),
 ])
 ]
})

export class MainComponent implements  AfterViewInit {

allItems: MenuItem[] = [];
filteredItems: MenuItem[] = [];
menuVisible = true;
menuLoading = true;
selectedCategory: string = '';
showBackToTop: boolean = false;
selectedItem: string = 'All';
menuItems: string[] = ['All', 'Salads', 'Cold Dishes', 'Hot Dishes', 'Pastries', 'Grill', 'Sauces', 'Drinks'];
drinkSubCategories: string[] = ['Coffee & Tea', 'Cocktails', 'Soft Drinks'];
selectedSubCategory: string = '';

constructor( private menuService: MenuService, @Inject(PLATFORM_ID) private platformId: Object,  private translateService: TranslateService) 
{
this.translateService.setDefaultLang('en'); // Set default language for translations (language switching itself lives in HeaderComponent)
}

// Fetch menu items on component initialization
ngOnInit(): void {
  this.menuService.getMenuItems().subscribe({
    next: (items) => {
      // Store all menu items and initialize filtered items
      this.allItems = items.map(item => ({
        ...item,
        showDescription: false // Add flag to toggle description
      }));
      this.filteredItems = this.allItems;
      this.menuLoading = false;
    },
    error: (err) => {
      console.error('Failed to fetch menu items', err);
      this.menuLoading = false;
    }
  });
}

// Handle main category selection
selectItem(item: string): void {
  this.selectedItem = item;
  this.selectedSubCategory = '';
  if (item !== 'Drinks') {
    this.selectedCategory = item;
  }

  // Re-animate menu after filtering
  this.menuVisible = false;
  setTimeout(() => {
    this.filterItemsByCategory();
    this.menuVisible = true;
  }, 0);
}

// Handle drink subcategory selection
selectSubCategory(sub: string): void {
  this.selectedSubCategory = sub;
  this.selectedCategory = sub;

  // Re-animate menu after filtering
  this.menuVisible = false;
  setTimeout(() => {
    this.filterItemsByCategory();
    this.menuVisible = true;
  }, 0);
}

// Filter items based on selected category or subcategory
filterItemsByCategory(): void {
  if (this.selectedItem === 'All') {
    this.filteredItems = this.allItems;
    return;
  }

  if (this.selectedItem === 'Drinks') {
    if (this.selectedSubCategory) {
      // Filter by selected drink subcategory
      this.filteredItems = this.allItems.filter(
        item => item.category === this.selectedSubCategory
      );
    } else {
      // Show all drink subcategories
      this.filteredItems = this.allItems.filter(item =>
        ['Coffee & Tea', 'Cocktails', 'Soft Drinks'].includes(item.category)
      );
    }
    return;
  }

  // Filter by regular category
  this.filteredItems = this.allItems.filter(
    item => item.category === this.selectedCategory
  );
}

// Toggle item description visibility
toggleDescription(item: any): void {
  item.showDescription = !item.showDescription;
}

// The seeded menu items store a dotted translation key in `name` (e.g.
// "salads.cucumberTomato"), resolved via the translate pipe against
// public/i18n/en.json / ka.json. Meals added or renamed through the admin
// panel use a plain English name plus an optional Georgian name instead, so
// only fall back to the translation lookup when `name` still looks like a key.
displayName(item: MenuItem): string {
  if (/^[a-zA-Z]+\.[a-zA-Z0-9]+$/.test(item.name)) {
    return this.translateService.instant('items.' + item.name);
  }
  return (this.translateService.currentLang === 'ka' && item.nameKa) ? item.nameKa : item.name;
}

// Scroll smoothly to the top of the page
scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize slideshow and scroll listeners after view loads
ngAfterViewInit(): void {
  if (isPlatformBrowser(this.platformId)) {
    let currentSlide = 0;
    const slides = document.querySelectorAll<HTMLImageElement>('.slide');

    // Automatically cycle through slideshow images every 3 seconds
    if (slides.length > 0) {
      setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
      }, 3000);
    }

    // Smooth-scroll to menu section on button click
    const scrollToMenu = () => {
      const menuSection = document.getElementById('menu');
      menuSection?.scrollIntoView({ behavior: 'smooth' });
    };

    const menuBtn = document.getElementById('menuBtn');
    menuBtn?.addEventListener('click', scrollToMenu);

    // Show "Back to Top" button after scrolling 200px
    window.addEventListener('scroll', () => {
      this.showBackToTop = window.scrollY > 200;
    });
  }
}
}