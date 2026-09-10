import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminService } from '../adminServices/admin.service';  // your service for API calls
import { MenuItem } from '../services/menu.model';
import { from } from 'rxjs';
import { concatMap, delay, tap } from 'rxjs/operators';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-bulk-upload',
  templateUrl: './bulk-upload.component.html',
  imports: [NgIf],
  styleUrls: ['./bulk-upload.component.css']
})
export class BulkUploadComponent implements OnInit {

  // Holds the list of menu items to upload
  menuItems: MenuItem[] = [];

  // Loading indicator and user message
  loading = false;
  message = '';

  constructor(private http: HttpClient, private adminService: AdminService) {}

  // Load menu data from local JSON file when component initializes
  ngOnInit(): void {
    this.loadInitialData();
  }

  // Load initial menu data from assets/initialMenuData.json
  loadInitialData() {
    this.http.get<MenuItem[]>('assets/initialMenuData.json').subscribe(
      data => {
        this.menuItems = data;
      },
      error => {
        console.error('Failed to load JSON', error);
      }
    );
  }

  // Perform bulk upload of menu items with delay between requests
  bulkUpload() {
    if (!this.menuItems.length) {
      this.message = 'No items to upload!';
      return;
    }

    this.loading = true;
    this.message = '';

    // Stream the items one-by-one with 500ms delay between each
    from(this.menuItems).pipe(
      concatMap((item, index) =>
        this.adminService.addMenu(item).pipe(
          delay(index === 0 ? 0 : 500), // Delay only after first item
          tap(() => {
            this.message = `Uploaded ${index + 1} of ${this.menuItems.length} items...`;
          })
        )
      )
    ).subscribe({
      next: () => {},

      // Handle error during upload
      error: (err) => {
        this.loading = false;
        this.message = 'Error during bulk upload.';
        console.error(err);
      },

      // Set success message when all uploads complete
      complete: () => {
        this.loading = false;
        this.message = 'Bulk upload successful!';
      }
    });
  }

  // Replaces the photo on every meal with the placeholder image. Harmless back
  // when this pointed at throwaway test data, but it now rewrites the real menu,
  // so it asks first.
  updateImages() {
    const proceed = confirm('This replaces the photo on EVERY meal with the placeholder image. Continue?');
    if (!proceed) {
      return;
    }

    this.loading = true;
    this.message = '';
    this.adminService.setAllMealImages('assets/food.jpg').subscribe({
      next: (count) => {
        this.loading = false;
        this.message = `Updated ${count} meal images.`;
      },
      error: () => {
        this.loading = false;
        this.message = 'Could not update the images.';
      }
    });
  }
}