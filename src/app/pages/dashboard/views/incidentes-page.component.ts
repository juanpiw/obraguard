import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

type IncidentCategory = 'persona' | 'maquinaria' | 'material' | 'ambiente';
type IncidentSeverity = 'leve' | 'mediano' | 'grave';

interface IncidentReport {
  category: IncidentCategory | null;
  severity: IncidentSeverity | null;
  affected: string;
  description: string;
}

interface AlertItem {
  title: string;
  time: string;
  desc: string;
  target: string;
  icon: string;
  color: string;
  status: 'sent' | 'draft';
}

@Component({
  selector: 'app-incidentes-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incidentes-page.component.html',
  styleUrl: './incidentes-page.component.scss'
})
export class IncidentesPageComponent implements OnDestroy {
  protected isModalOpen = false;
  protected currentStep = 1;
  protected showToast = false;

  protected incidentData: IncidentReport = {
    category: null,
    severity: null,
    affected: '',
    description: ''
  };

  protected readonly categories = [
    { id: 'persona' as const, label: 'Persona', icon: '👷' },
    { id: 'maquinaria' as const, label: 'Maquinaria', icon: '🚜' },
    { id: 'material' as const, label: 'Material', icon: '🧱' },
    { id: 'ambiente' as const, label: 'Ambiente', icon: '🌧️' }
  ];

  protected alerts: AlertItem[] = [
    {
      title: 'Falla Hidráulica Grúa T-4',
      time: 'Hace 10 min',
      desc: 'Manguera rota, derrame contenido en zona segura.',
      target: 'Maquinaria',
      icon: '🚜',
      color: 'bg-yellow-500',
      status: 'sent'
    },
    {
      title: 'Caída de Material Piso 3',
      time: 'Hace 2 hrs',
      desc: 'Sin heridos, zona aislada preventivamente.',
      target: 'Material',
      icon: '🧱',
      color: 'bg-red-500',
      status: 'sent'
    }
  ];

  private toastTimeoutId: number | undefined;

  get progressPercent(): number {
    return (this.currentStep / 4) * 100;
  }

  ngOnDestroy(): void {
    if (this.toastTimeoutId) {
      window.clearTimeout(this.toastTimeoutId);
    }
  }

  protected openModal(): void {
    this.currentStep = 1;
    this.isModalOpen = true;
  }

  protected closeModal(): void {
    this.isModalOpen = false;
    window.setTimeout(() => this.resetForm(), 250);
  }

  protected selectCategory(category: IncidentCategory): void {
    this.incidentData.category = category;
    this.currentStep = 2;
  }

  protected selectSeverity(severity: IncidentSeverity): void {
    this.incidentData.severity = severity;
    this.currentStep = 3;
  }

  protected backTo(step: number): void {
    this.currentStep = step;
  }

  protected goToPreview(): void {
    this.currentStep = 4;
  }

  protected sendIncident(): void {
    const icons: Record<IncidentCategory, string> = {
      persona: '👷',
      maquinaria: '🚜',
      material: '🧱',
      ambiente: '🌧️'
    };

    const colors: Record<IncidentSeverity, string> = {
      leve: 'bg-green-500',
      mediano: 'bg-yellow-500',
      grave: 'bg-red-500'
    };

    const category = this.incidentData.category ?? 'material';
    const severity = this.incidentData.severity ?? 'leve';

    const newAlert: AlertItem = {
      title: `Incidente: ${category.toUpperCase()}`,
      time: 'Ahora',
      desc: `${this.incidentData.description} (${this.incidentData.affected})`,
      target: severity,
      icon: icons[category],
      color: colors[severity],
      status: 'sent'
    };

    this.alerts = [newAlert, ...this.alerts].slice(0, 6);
    this.showToast = true;
    this.isModalOpen = false;

    if (this.toastTimeoutId) {
      window.clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = window.setTimeout(() => {
      this.showToast = false;
    }, 3500);

    this.resetForm();
  }

  protected hasDetails(): boolean {
    return Boolean(this.incidentData.affected && this.incidentData.description);
  }

  private resetForm(): void {
    this.currentStep = 1;
    this.incidentData = {
      category: null,
      severity: null,
      affected: '',
      description: ''
    };
  }
}


