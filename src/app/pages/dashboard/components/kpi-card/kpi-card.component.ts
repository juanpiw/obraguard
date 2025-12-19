import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type KpiAccent = 'red' | 'green' | 'blue';
type KpiIcon = 'alert' | 'check' | 'document';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss'
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() helper = '';
  @Input() accent: KpiAccent = 'blue';
  @Input() icon: KpiIcon = 'document';

  protected iconPath(): string {
    switch (this.icon) {
      case 'alert':
        return 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z';
      case 'check':
        return 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'document':
      default:
        return 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m-1.125 0H6.75A2.25 2.25 0 004.5 4.5v15A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 18.75v-2.625m-3.75-10.5a3.375 3.375 0 00-3.375-3.375H8.25m1.125 0v1.5a1.125 1.125 0 01-1.125 1.125h-1.5';
    }
  }
}





