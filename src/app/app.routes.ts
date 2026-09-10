import { Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { MainComponent } from './main/main.component';
import { BulkUploadComponent } from './bulk-upload/bulk-upload.component';
import { ReserveComponent } from './reserve/reserve.component';
import { AdminReservationsComponent } from './admin-reservations/admin-reservations.component';

export const routes: Routes = [
    {path: '', component: MainComponent},
    {path: 'reserve', component: ReserveComponent},
    {path: 'my-reservations', redirectTo: 'reserve'},
    {path: 'adminpanelss', component:AdminComponent},
    {path: 'adminpanelss/reservations', component:AdminReservationsComponent},
    {path: 'upload', component:BulkUploadComponent}
];
