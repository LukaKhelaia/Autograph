import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { collection, getDocs } from 'firebase/firestore';
import { MenuItem } from './menu.model';
import { db, isBrowser } from './firebase';
import { sortMenuItems } from './menu-order';

// Read-only view of the menu, used by the public site.
@Injectable({
  providedIn: 'root'
})
export class MenuService {

  // Fetch all menu items from Firestore.
  getMenuItems(): Observable<MenuItem[]> {
    if (!isBrowser()) {
      return of([]);
    }

    const load = async (): Promise<MenuItem[]> => {
      const snapshot = await getDocs(collection(db(), 'meals'));
      return sortMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    };

    return from(load());
  }
}
