import { Component,  OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from '../services/menu.model';
import { AdminService } from '../adminServices/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PanelAuthComponent } from '../shared/panel-auth/panel-auth.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin',
  imports: [RouterModule,CommonModule,FormsModule,PanelAuthComponent,TranslateModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

// Array to hold all menu items
meals: MenuItem[] = [];

// Form model for creating/editing a menu item
meal: MenuItem = {
  image: '',
  name: '',
  nameKa: '',
  price: 0,
  description: '',
  category: '',
  id: ''
};

// Edit mode flag
editMode = false;

// Holds the ID of the item currently being edited
currentEditId: string = '';

// Search + category filter for the meal list below the form
searchTerm = '';
activeCategory = 'All';

// Meals are fetched from Firestore, so the list starts out empty for a moment.
loadingMeals = true;

constructor(private adminService: AdminService, private translateService: TranslateService) {}

  // On component initialization, fetch all meals
ngOnInit(): void {
  this.fetchMeals();
}

// Retrieve all menu items from backend
fetchMeals(): void {
  this.loadingMeals = true;
  this.adminService.getAllMenus().subscribe({
    next: data => {
      this.meals = data;
      this.loadingMeals = false;
    },
    error: () => {
      this.loadingMeals = false;
    }
  });
}

// Distinct categories present in the current menu, used to build the filter chips
get categories(): string[] {
  return [...new Set(this.meals.map(m => m.category).filter(c => !!c))].sort();
}

// Meals shown in the list below, after the search box and category chip are applied
get filteredMeals(): MenuItem[] {
  let list = this.meals;

  if (this.activeCategory !== 'All') {
    list = list.filter(m => m.category === this.activeCategory);
  }

  const term = this.searchTerm.trim().toLowerCase();
  if (term) {
    list = list.filter(m =>
      this.displayName(m).toLowerCase().includes(term) ||
      (m.nameKa || '').toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term)
    );
  }

  return list;
}

// The seeded menu items store a dotted translation key in `name` (e.g.
// "salads.cucumberTomato"), resolved against public/i18n/en.json. Meals
// added or renamed through this form use a plain English name instead, so
// only fall back to the translation lookup when `name` still looks like a key.
displayName(item: MenuItem): string {
  return /^[a-zA-Z]+\.[a-zA-Z0-9]+$/.test(item.name)
    ? this.translateService.instant('items.' + item.name)
    : item.name;
}

setCategoryFilter(category: string): void {
  this.activeCategory = category;
}

// Handle form submission for adding or updating a menu item
onSubmit(): void {
  if (this.editMode) {
    // Update existing menu item
    this.adminService.updateMenu(this.currentEditId, this.meal).subscribe(() => {
      this.fetchMeals();  // Refresh list
      this.resetForm();   // Reset form
    });
  } else {
    // Add new menu item
    this.adminService.addMenu(this.meal).subscribe(() => {
      this.fetchMeals();  // Refresh list
      this.resetForm();   // Reset form
    });
  }
}

// Load selected item into the form for editing
editMeal(item: any): void {
  this.editMode = true;
  this.currentEditId = item.id;
  this.meal = { ...item }; // Clone the item to avoid binding issues
  document.getElementById('meal-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Delete a menu item after confirmation
deleteMeal(id: string): void {
  if (confirm('Are you sure you want to delete this meal?')) {
    this.adminService.deleteMenu(id).subscribe(() => {
      this.fetchMeals();  // Refresh list
    });
  }
}

// Cancel edit mode and reset the form
cancelEdit(): void {
  this.resetForm();
}

// Clear the form and reset edit state
resetForm(): void {
  this.meal = {
    image: '',
    name: '',
    nameKa: '',
    price: 0,
    description: '',
    category: '',
    id: ''
  };
  this.editMode = false;
  this.currentEditId = '';
}
}
