import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-relato',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-relato.component.html',
  styleUrl: './report-relato.component.scss'
})
export class ReportRelatoComponent {
  @Input() disabled = false;
  @Input() relato: string = '';
  @Output() save = new EventEmitter<string>();
}





