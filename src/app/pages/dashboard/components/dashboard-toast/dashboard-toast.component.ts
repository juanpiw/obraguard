import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dashboard-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-toast.component.html',
  styleUrl: './dashboard-toast.component.scss'
})
export class DashboardToastComponent {
  @Input() message = '';
  @Input() visible = false;

  @Output() dismiss = new EventEmitter<void>();
}





