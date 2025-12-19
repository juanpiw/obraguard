import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { HallazgosService } from '../../../core/services/hallazgos.service';
import { KpiCardComponent } from '../components/kpi-card/kpi-card.component';
import { HallazgosTableComponent } from '../components/hallazgos-table/hallazgos-table.component';

interface SectorRisk {
  label: string;
  total: number;
  percentage: number;
  color: 'red' | 'yellow' | 'indigo' | 'green';
}

interface CriticalAlert {
  title: string;
  location: string;
  severity: 'red' | 'orange';
}

interface DashboardKpi {
  label: string;
  value: string;
  helper: string;
  icon: 'alert' | 'check' | 'document';
  accent: 'red' | 'green' | 'blue';
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, HallazgosTableComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent {
  private readonly hallazgosService = inject(HallazgosService);

  protected readonly hallazgos = this.hallazgosService.hallazgos;
  protected readonly abiertos = this.hallazgosService.abiertosCount;
  protected readonly cerradosUltimos7 =
    this.hallazgosService.cerradosUltimos7Dias;

  protected readonly kpiCards = computed<DashboardKpi[]>(() => [
    {
      label: 'Hallazgos Abiertos',
      value: this.abiertos().toString(),
      helper: '+3 vs semana pasada',
      icon: 'alert',
      accent: 'red'
    },
    {
      label: 'Cerrados (Últ. 7d)',
      value: this.cerradosUltimos7().toString(),
      helper: 'Tiempo prom. cierre: 2.1 días',
      icon: 'check',
      accent: 'green'
    },
    {
      label: 'Charlas al día',
      value: '95%',
      helper: '2 de 40 cuadrillas pendientes',
      icon: 'document',
      accent: 'blue'
    }
  ]);

  protected readonly riskBySector: SectorRisk[] = [
    { label: 'Torre A', total: 5, percentage: 70, color: 'red' },
    { label: 'Bodega', total: 3, percentage: 40, color: 'yellow' },
    { label: 'Perímetro', total: 2, percentage: 25, color: 'indigo' },
    { label: 'Oficinas', total: 1, percentage: 10, color: 'green' }
  ];

  protected readonly criticalAlerts: CriticalAlert[] = [
    {
      title: 'Andamio mal afianzado',
      location: 'Torre A, Piso 5 · Hace 2h',
      severity: 'red'
    },
    {
      title: 'Cable expuesto (lluvia)',
      location: 'Exterior Norte · Hace 30m',
      severity: 'orange'
    }
  ];
}

