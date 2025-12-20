import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-kpi-cards.component.html',
  styleUrl: './document-kpi-cards.component.scss'
})
export class DocumentKpiCardsComponent {
  @Input() totalDocs = 0;
  @Input() expiredDocs = 0;
}

