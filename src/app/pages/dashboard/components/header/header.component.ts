import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class DashboardHeaderComponent {
  @Input() title = 'Dashboard';

  @Output() toggleMenu = new EventEmitter<void>();
  @Output() openModal = new EventEmitter<void>();
}





