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
  isErrorMessage = false;
  loading = false;
  isDragging = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.setFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setFile(file);
  }

  clearFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.message = '';
    this.isErrorMessage = false;
  }

  private setFile(file: File | null): void {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      this.message = 'Only PDF and DOCX files are accepted.';
      this.isErrorMessage = true;
      return;
    }
    this.selectedFile = file;
    this.message = '';
    this.isErrorMessage = false;
  }

  upload(): void {
    if (!this.selectedFile) {
      this.message = 'Please select a file first.';
      this.isErrorMessage = true;
      this.toastService.show('Upload blocked', this.message, 'error');
      return;
    }

    this.loading = true;
    this.message = '';
    this.isErrorMessage = false;

    this.candidateService.uploadCv(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = `${res.message} — redirecting to review screen…`;
        this.isErrorMessage = false;
        this.toastService.show('CV uploaded', res.message, 'success');
        this.router.navigate(['/candidates/edit', res.candidateId]);
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.message || 'Upload failed. Please try again.';
        this.isErrorMessage = true;
        this.toastService.show('Upload failed', this.message, 'error');
      }
    });
  }

  isDocx(name: string): boolean {
    return name.toLowerCase().endsWith('.docx');
  }

  fileExtension(name: string): string {
    return (name.split('.').pop() ?? '').toUpperCase();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
