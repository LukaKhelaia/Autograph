import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { MenuItem } from '../services/menu.model';
import { db, isBrowser } from '../services/firebase';
import { sortMenuItems } from '../services/menu-order';

// Menu management, used by the manager's admin panel. Writing here is gated by
// the Firestore rules: only a signed-in account whose staff record says
// role === 'manager' can add, edit or delete a meal.
@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private get mealsRef() {
    return collection(db(), 'meals');
  }

  // Fetch every menu item, in menu order.
  getAllMenus(): Observable<MenuItem[]> {
    if (!isBrowser()) {
      return of([]);
    }

    const load = async (): Promise<MenuItem[]> => {
      const snapshot = await getDocs(this.mealsRef);
      return sortMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    };

    return from(load());
  }

  // Add a new menu item. New items sort to the end of their category by default.
  addMenu(menu: MenuItem): Observable<string> {
    const create = async (): Promise<string> => {
      const payload = this.toDocument(menu);
      const created = await addDoc(this.mealsRef, {
        ...payload,
        sortOrder: payload['sortOrder'] ?? Date.now()
      });
      return created.id;
    };

    return from(create());
  }

  // Update an existing menu item by its Firestore document id.
  updateMenu(id: string, menu: MenuItem): Observable<void> {
    return from(updateDoc(doc(db(), 'meals', id), this.toDocument(menu)));
  }

  // Delete a menu item by its Firestore document id.
  deleteMenu(id: string): Observable<void> {
    return from(deleteDoc(doc(db(), 'meals', id)));
  }

  // Development helper carried over from the original build: points every meal
  // at the same placeholder image. This rewrites real menu photos, so the page
  // that offers it asks for confirmation first.
  setAllMealImages(image: string): Observable<number> {
    const run = async (): Promise<number> => {
      const database = db();
      const snapshot = await getDocs(collection(database, 'meals'));
      const chunkSize = 400;

      for (let start = 0; start < snapshot.docs.length; start += chunkSize) {
        const batch = writeBatch(database);
        snapshot.docs.slice(start, start + chunkSize).forEach(mealDoc => {
          batch.update(mealDoc.ref, { image });
        });
        await batch.commit();
      }

      return snapshot.docs.length;
    };

    return from(run());
  }

  // The document id lives on the document itself in Firestore, and
  // showDescription is a UI-only flag — neither belongs in the stored data.
  private toDocument(menu: MenuItem): Record<string, any> {
    const { id, showDescription, ...rest } = menu as MenuItem & { sortOrder?: number };
    return {
      ...rest,
      name: (rest.name ?? '').trim(),
      nameKa: (rest.nameKa ?? '').trim(),
      description: (rest.description ?? '').trim(),
      category: (rest.category ?? '').trim(),
      price: Number(rest.price) || 0
    };
  }
}
