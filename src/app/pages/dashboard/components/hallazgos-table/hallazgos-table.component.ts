import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Hallazgo } from '../../../../core/models/hallazgo.model';

@Component({
  selector: 'app-hallazgos-table',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './hallazgos-table.component.html',
  styleUrl: './hallazgos-table.component.scss'
})
export class HallazgosTableComponent {
  @Input() hallazgos: Hallazgo[] = [];

  protected statusClass(estado: Hallazgo['estado']): string {
    switch (estado) {
      case 'Abierto':
        return 'status-pill status-pill--red';
      case 'En Proceso':
        return 'status-pill status-pill--yellow';
      case 'Cerrado':
        return 'status-pill status-pill--green';
      case 'Pendiente':
        return 'status-pill status-pill--gray';
      case 'PendienteValidacion':
        return 'status-pill status-pill--blue';
      case 'Confirmado':
        return 'status-pill status-pill--purple';
      default:
        return 'status-pill';
    }
  }

  protected riesgoClass(riesgo: Hallazgo['riesgo']): string {
    switch (riesgo) {
      case 'Alto':
        return 'riesgo riesgo--alto';
      case 'Medio':
        return 'riesgo riesgo--medio';
      case 'Bajo':
        return 'riesgo riesgo--bajo';
      default:
        return 'riesgo';
    }
  }
}





