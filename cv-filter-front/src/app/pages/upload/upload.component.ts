import { Component, inject } from '@angular/core';
import { CandidateService } from '../../services/candidate.service';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent {
  private candidateService = inject(CandidateService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  selectedFile: File | null = null;
  message = '';
  loading = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  upload(): void {
    if (!this.selectedFile) {
      this.message = 'Please select a file first';
      this.toastService.show('Upload blocked', this.message, 'error');
      return;
    }

    this.loading = true;
    this.message = 'Uploading and parsing CV...';

    this.candidateService.uploadCv(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = `${res.message}. Opening review screen...`;
        this.toastService.show('CV uploaded', res.message, 'success');
        this.router.navigate(['/candidates/edit', res.candidateId]);
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.message || 'Upload failed';
        this.toastService.show('Upload failed', this.message, 'error');
      }
    });
  }
}
