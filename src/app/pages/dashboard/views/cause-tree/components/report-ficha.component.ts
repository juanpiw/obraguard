import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type ReportFicha = {
  empresa?: string;
  nombre?: string;
  rut?: string;
  cargo?: string;
  fecha?: string;
  hora?: string;
  lugar?: string;
};

@Component({
  selector: 'app-report-ficha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-ficha.component.html',
  styleUrl: './report-ficha.component.scss'
})
export class ReportFichaComponent {
  @Input() disabled = false;
  @Input() ficha: ReportFicha = {};

  @Output() save = new EventEmitter<ReportFicha>();
}




