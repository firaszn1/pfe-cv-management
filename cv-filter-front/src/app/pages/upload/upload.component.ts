import { Component, inject } from '@angular/core';
import { CandidateService } from '../../services/candidate.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent {
  private candidateService = inject(CandidateService);

  selectedFile: File | null = null;
  message = '';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  upload(): void {
    if (!this.selectedFile) {
      this.message = 'Please select a file first';
      return;
    }

    this.candidateService.uploadCv(this.selectedFile).subscribe({
      next: (res) => this.message = res.message,
      error: (err) => this.message = err?.error?.message || 'Upload failed'
    });
  }
}