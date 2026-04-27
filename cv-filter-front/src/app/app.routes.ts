import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UploadComponent } from './pages/upload/upload.component';
import { CandidatesComponent } from './pages/candidates/candidates.component';
import { EditCandidateComponent } from './pages/edit-candidate/edit-candidate.component';
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { RegisterComponent } from './pages/register/register.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
  { path: 'candidates', component: CandidatesComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard] },
  { path: 'candidates/edit/:id', component: EditCandidateComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
