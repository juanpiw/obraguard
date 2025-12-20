import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HallazgosService } from '../../../core/services/hallazgos.service';
import { Hallazgo } from '../../../core/models/hallazgo.model';
import { Router } from '@angular/router';

type FindingCategory = 'security' | 'legal' | 'thermal' | 'seismic';
type FindingPriority = 'high' | 'medium' | 'low';
type FindingStatus = 'open' | 'review' | 'closed';

interface Finding {
  id: string;
  title: string;
  location: string;
  category: FindingCategory;
  priority: FindingPriority;
  status: FindingStatus;
  detectedBy: 'IA' | 'Manual';
  timestamp: Date;
  regulation?: string; // norma o referencia
  recommendation?: string; // texto IA / descripcion
  assignedTo?: string;
  imageUrl?: string;
  comments: number;
  sentTo?: string[];
}

@Component({
  selector: 'app-hallazgos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hallazgos-page.component.html',
  styleUrl: './hallazgos-page.component.scss'
})
export class HallazgosPageComponent {
  private readonly hallazgosService = inject(HallazgosService);
  private readonly router = inject(Router);

  searchQuery = signal('');
  currentFilter = signal<'all' | FindingCategory>('all');
  isLoading = signal(false);
  error = signal<string | null>(null);
  exporting = signal(false);
  exportMessage = signal<string | null>(null);

  categories = [
    { id: 'all' as const, label: 'Todo', dotClass: 'bg-slate-400' },
    { id: 'security' as const, label: 'Seguridad (DS 44)', dotClass: 'bg-red-500' },
    { id: 'legal' as const, label: 'Legal (Ley 21.718)', dotClass: 'bg-amber-400' },
    { id: 'seismic' as const, label: 'Sísmico (NCh)', dotClass: 'bg-purple-500' },
    { id: 'thermal' as const, label: 'Térmico (Res 1802)', dotClass: 'bg-cyan-500' },
  ];

  findings = signal<Finding[]>([]);

  criticalCount = computed(() => this.findings().filter(f => f.priority === 'high' && f.status === 'open').length);
  legalCount = computed(() => this.findings().filter(f => f.category === 'legal' && f.status !== 'closed').length);

  filteredFindings = computed(() => {
    const cat = this.currentFilter();
    const query = this.searchQuery().toLowerCase();

    return this.findings().filter(item => {
      const matchCat = cat === 'all' || item.category === cat;
      const matchSearch =
        item.title.toLowerCase().includes(query) ||
        item.regulation?.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  });

  updateStatus(id: string, newStatus: FindingStatus) {
    this.findings.update(items => items.map(i => i.id === id ? { ...i, status: newStatus } : i));
    this.hallazgosService.updateEstado(id, this.mapStatusToEstado(newStatus)).subscribe({
      next: () => {
        this.fetchFindings();
      },
      error: (err) => {
        console.error('[Hallazgos][UI] update estado error', err);
        this.error.set('No se pudo actualizar el estado.');
      }
    });
  }

  // --- Modal de enviados ---
  modalOpen = signal(false);
  modalItem = signal<Finding | null>(null);
  resendTarget = signal('');
  resendStatus = signal<{ ok: boolean; message: string } | null>(null);

  openRecipients(item: Finding) {
    this.modalItem.set(item);
    this.resendTarget.set('');
    this.resendStatus.set(null);
    this.modalOpen.set(true);
  }

  closeRecipients() {
    this.modalOpen.set(false);
    this.modalItem.set(null);
  }

  resend() {
    const value = this.resendTarget().trim();
    if (!value) {
      this.resendStatus.set({ ok: false, message: 'Ingresa correo o teléfono.' });
      return;
    }

    const item = this.modalItem();
    if (item) {
      // Simulamos envío y agregamos a la lista visible
      const updated = { ...item, sentTo: [...(item.sentTo ?? []), value] };
      this.findings.update(list => list.map(f => f.id === item.id ? updated : f));
      this.modalItem.set(updated);
      this.resendTarget.set('');
      this.resendStatus.set({ ok: true, message: 'Reenviado correctamente.' });
    }
  }

  getPriorityColor(p: FindingPriority, type: 'bg' | 'text'): string {
    const map = {
      high: type === 'bg' ? 'bg-red-500' : 'text-red-600',
      medium: type === 'bg' ? 'bg-amber-500' : 'text-amber-600',
      low: type === 'bg' ? 'bg-blue-400' : 'text-blue-500'
    };
    return map[p];
  }

  getCategoryBadge(c: FindingCategory): string {
    const map = {
      security: 'bg-red-50 text-red-700 border-red-200',
      legal: 'bg-amber-50 text-amber-700 border-amber-200',
      seismic: 'bg-purple-50 text-purple-700 border-purple-200',
      thermal: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    };
    return map[c];
  }

  getCategoryLabel(c: FindingCategory): string {
    const map = {
      security: 'Seguridad',
      legal: 'Legal',
      seismic: 'Sísmico',
      thermal: 'Térmico'
    };
    return map[c];
  }

  constructor() {
    effect(() => {
      // refetch on filter/search change
      this.currentFilter();
      this.searchQuery();
      this.fetchFindings();
    });
  }

  exportPdf(): void {
    const first = this.findings()[0];
    if (!first) {
      this.exportMessage.set('No hay hallazgos para exportar.');
      return;
    }
    this.exporting.set(true);
    this.exportMessage.set(null);
    this.hallazgosService.getHallazgoPdf(first.id).subscribe({
      next: (resp) => {
        this.exporting.set(false);
        const url = resp?.pdfUrl;
        if (url) {
          window.open(url, '_blank');
        } else {
          this.exportMessage.set(resp?.message || 'PDF generado pendiente.');
        }
      },
      error: (err) => {
        console.error('[Hallazgos][UI] export PDF error', err);
        this.exportMessage.set('No se pudo exportar el PDF.');
        this.exporting.set(false);
      }
    });
  }

  createFinding() {
    // Redirige al dashboard donde está el modal de hallazgo
    this.router.navigate(['/app/dashboard'], { queryParams: { openHallazgo: '1' } });
  }

  private fetchFindings(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const tipo = this.mapFilterToTipo(this.currentFilter());
    const q = this.searchQuery().trim();
    this.hallazgosService
      .loadHallazgos({ limit: 50, page: 1, tipo, q })
      .subscribe({
        next: (rows) => {
          this.findings.set(rows.map((h) => this.mapHallazgoToFinding(h)));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('[Hallazgos][UI] load error', err);
          this.error.set('No se pudieron cargar los hallazgos.');
          this.isLoading.set(false);
        }
      });
  }

  private mapHallazgoToFinding(h: Hallazgo): Finding {
    const status = this.mapEstadoToStatus(h.estado);
    const category = this.detectCategory(h);
    const priority = this.mapRiesgoToPriority(h.riesgo);
    return {
      id: String(h.id),
      title: h.titulo || 'Hallazgo',
      location: h.sector || 'Obra',
      category,
      priority,
      status,
      detectedBy: 'IA',
      timestamp: h.fecha ? new Date(h.fecha) : new Date(),
      regulation: h.descripcion_ai || undefined,
      recommendation: h.descripcion_ai || undefined,
      assignedTo: h.reportero || 'Equipo',
      comments: 0,
      sentTo: []
    };
  }

  private mapEstadoToStatus(estado?: any): FindingStatus {
    const val = String(estado || '').toLowerCase();
    if (val.includes('cerr')) return 'closed';
    if (val.includes('revis') || val.includes('proc') || val.includes('conf')) return 'review';
    return 'open';
  }

  private mapStatusToEstado(status: FindingStatus): string {
    if (status === 'closed') return 'Cerrado';
    if (status === 'review') return 'En Proceso';
    return 'Abierto';
  }

  private mapRiesgoToPriority(r?: any): FindingPriority {
    const v = String(r || '').toLowerCase();
    if (v.includes('alto')) return 'high';
    if (v.includes('bajo')) return 'low';
    return 'medium';
  }

  private detectCategory(h: Hallazgo): FindingCategory {
    const text = `${h.titulo || ''} ${h.descripcion_ai || ''}`.toLowerCase();
    if (text.includes('sísm') || text.includes('sism')) return 'seismic';
    if (text.includes('térm') || text.includes('term') || text.includes('vapor')) return 'thermal';
    if (text.includes('legal') || text.includes('ley') || text.includes('permiso')) return 'legal';
    return 'security';
  }

  private mapFilterToTipo(filter: 'all' | FindingCategory): string | undefined {
    if (filter === 'all') return undefined;
    if (filter === 'security') return 'seguridad';
    if (filter === 'legal') return 'legal';
    if (filter === 'seismic') return 'sismico';
    if (filter === 'thermal') return 'termico';
    return undefined;
  }
}