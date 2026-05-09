import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CandidateService, DashboardStatsResponse } from '../../services/candidate.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

  /** Width % for skill bars (based on max skill count) */
  getBarWidth(count: number): number {
    if (!this.stats || this.stats.topSkills.length === 0) return 0;
    const max = Math.max(...this.stats.topSkills.map(s => s.count), 1);
    return Math.round((count / max) * 100);
  }

  /** Width % relative to total candidates (for stat mini-bars) */
  getMiniBarWidth(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  /** Percentage of total for seniority distribution */
  getPercent(count: number): number {
    if (!this.stats?.totalCandidates) return 0;
    return Math.round((count / this.stats.totalCandidates) * 100);
  }
}