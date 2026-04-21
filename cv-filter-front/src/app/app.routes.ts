import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UploadComponent } from './pages/upload/upload.component';
import { CandidatesComponent } from './pages/candidates/candidates.component';
import { EditCandidateComponent } from './pages/edit-candidate/edit-candidate.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'upload', component: UploadComponent },
  { path: 'candidates', component: CandidatesComponent },
  { path: 'candidates/edit/:id', component: EditCandidateComponent },
  { path: '**', redirectTo: 'dashboard' }
];