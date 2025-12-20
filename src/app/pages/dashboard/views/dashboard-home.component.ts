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
  protected readonly stats = this.hallazgosService.stats;

  protected readonly kpiCards = computed<DashboardKpi[]>(() => {
    const st = this.stats();
    const newVs = st?.newVsPrevWeek ?? null;
    const avgClose = st?.avgCloseDays ?? null;
    return [
      {
        label: 'Hallazgos Abiertos',
        value: (st?.openCount ?? 0).toString(),
        helper:
          st == null
            ? 'Cargando métricas...'
            : newVs === null
              ? 'Sin histórico semanal'
              : `${newVs >= 0 ? '+' : ''}${newVs} vs semana pasada (nuevos)`,
        icon: 'alert',
        accent: 'red'
      },
      {
        label: 'Cerrados (Últ. 7d)',
        value: (st?.closedLast7Days ?? 0).toString(),
        helper:
          st == null
            ? 'Cargando métricas...'
            : avgClose == null
              ? 'Tiempo prom. cierre: —'
              : `Tiempo prom. cierre: ${avgClose.toFixed(1)} días`,
        icon: 'check',
        accent: 'green'
      },
      {
        label: 'Charlas al día',
        value: '—',
        helper: 'Sin endpoint de charlas aún',
        icon: 'document',
        accent: 'blue'
      }
    ];
  });

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

  constructor() {
    // cargar valores reales desde backend
    this.hallazgosService.loadHallazgos().subscribe();
    this.hallazgosService.loadStats().subscribe();
  }
}

