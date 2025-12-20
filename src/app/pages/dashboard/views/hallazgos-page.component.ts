import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  regulation?: string;
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
  searchQuery = signal('');
  currentFilter = signal<'all' | FindingCategory>('all');

  categories = [
    { id: 'all' as const, label: 'Todo', dotClass: 'bg-slate-400' },
    { id: 'security' as const, label: 'Seguridad (DS 44)', dotClass: 'bg-red-500' },
    { id: 'legal' as const, label: 'Legal (Ley 21.718)', dotClass: 'bg-amber-400' },
    { id: 'seismic' as const, label: 'Sísmico (NCh)', dotClass: 'bg-purple-500' },
    { id: 'thermal' as const, label: 'Térmico (Res 1802)', dotClass: 'bg-cyan-500' },
  ];

  findings = signal<Finding[]>([
    {
      id: '204',
      title: 'Ausencia de Barandas en Borde de Losa',
      location: 'Torre A · Piso 12',
      category: 'security',
      priority: 'high',
      status: 'open',
      detectedBy: 'IA',
      timestamp: new Date(),
      regulation: 'Art. 12 DS 44',
      assignedTo: 'Empresa Constructora',
      comments: 3,
      sentTo: ['Ricardo (Jefe Obra)', 'Carolina (Prevención)', 'Grupo WhatsApp Obra']
    },
    {
      id: '203',
      title: 'Cartel de Permiso Municipal No Visible',
      location: 'Acceso Principal',
      category: 'legal',
      priority: 'medium',
      status: 'open',
      detectedBy: 'Manual',
      timestamp: new Date(Date.now() - 3600000 * 2),
      regulation: 'Ley 21.718 Transparencia',
      assignedTo: 'Administración',
      comments: 1,
      sentTo: ['Francisca (Gerencia)', 'Administrador de Contrato']
    },
    {
      id: '202',
      title: 'Equipos de Clima sin Anclaje Sísmico',
      location: 'Cubierta',
      category: 'seismic',
      priority: 'high',
      status: 'review',
      detectedBy: 'IA',
      timestamp: new Date(Date.now() - 3600000 * 24),
      regulation: 'Cap. 5 NCh2369',
      assignedTo: 'Subcontrato ClimaPro',
      comments: 5,
      sentTo: ['Subcontrato ClimaPro', 'ITO Estructural']
    },
    {
      id: '201',
      title: 'Falta Barrera de Vapor en Muro Perimetral',
      location: 'Fachada Sur',
      category: 'thermal',
      priority: 'medium',
      status: 'closed',
      detectedBy: 'IA',
      timestamp: new Date(Date.now() - 3600000 * 48),
      regulation: 'Res. 1802',
      assignedTo: 'Jefe de Terreno',
      comments: 0,
      sentTo: ['Jefe de Terreno', 'Arq. Especificador']
    }
  ]);

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
    this.findings.update(items =>
      items.map(i => i.id === id ? { ...i, status: newStatus } : i)
    );
  }

  createFinding() {
    alert('Iniciando flujo de cámara IA...');
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
}