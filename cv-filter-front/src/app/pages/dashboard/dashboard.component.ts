import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateService, DashboardStatsResponse } from '../../services/candidate.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private candidateService = inject(CandidateService);

  stats: DashboardStatsResponse | null = null;

  ngOnInit(): void {
    this.candidateService.getDashboardStats().subscribe({
      next: (res) => this.stats = res,
      error: () => {
        this.stats = {
          totalCandidates: 0,
          juniorCount: 0,
          midCount: 0,
          seniorCount: 0,
          topSkills: []
        };
      }
    });
  }

  getBarWidth(count: number): number {
    if (!this.stats || this.stats.topSkills.length === 0) {
      return 0;
    }

    const max = Math.max(...this.stats.topSkills.map(item => item.count), 1);
    return (count / max) * 100;
  }
}