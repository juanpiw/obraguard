import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentHeaderComponent } from '../../../shared/components/document-header/document-header.component';
import { DocumentKpiCardsComponent } from '../../../shared/components/document-kpi-cards/document-kpi-cards.component';
import { DocumentUploadZoneComponent } from '../../../shared/components/document-upload-zone/document-upload-zone.component';
import { DocumentFiltersComponent } from '../../../shared/components/document-filters/document-filters.component';
import { DocumentTableComponent } from '../../../shared/components/document-table/document-table.component';
import { DocumentFile, DocCategory, DocStatus } from '../../../shared/models/document.model';

@Component({
  selector: 'app-documentos-page',
  standalone: true,
  imports: [
    CommonModule,
    DocumentHeaderComponent,
    DocumentKpiCardsComponent,
    DocumentUploadZoneComponent,
    DocumentFiltersComponent,
    DocumentTableComponent
  ],
  templateUrl: './documentos-page.component.html',
  styleUrl: './documentos-page.component.scss'
})
export class DocumentosPageComponent {
  searchQuery = signal('');
  currentCategory = signal<DocCategory>('all');
  isDragging = signal(false);
  isUploading = signal(false);
  uploadPercent = signal(0);
  uploadStatusText = signal('Iniciando carga...');

  categories = [
    { id: 'all' as DocCategory, label: 'Todos', icon: '📂' },
    { id: 'legal' as DocCategory, label: 'Legal (Ley 21.718)', icon: '⚖️' },
    { id: 'plans' as DocCategory, label: 'Planimetría', icon: '📐' },
    { id: 'security' as DocCategory, label: 'Seguridad (DS 44)', icon: '🛡️' },
    { id: 'certs' as DocCategory, label: 'Certificados', icon: '📜' }
  ];

  docs = signal<DocumentFile[]>([
    {
      id: '1', name: 'Permiso Edificación Muni.pdf', size: '2.4 MB', type: 'pdf',
      uploadDate: new Date('2023-10-15'), category: 'legal', status: 'valid', uploadedBy: 'Admin', expiryDate: new Date('2024-12-31'), tags: []
    },
    {
      id: '2', name: 'Plano Estructural Torre A.dwg', size: '15 MB', type: 'dwg',
      uploadDate: new Date('2023-11-01'), category: 'plans', status: 'valid', uploadedBy: 'Calculista', tags: []
    },
    {
      id: '3', name: 'Certificado Mutualidad.pdf', size: '1.1 MB', type: 'pdf',
      uploadDate: new Date('2023-01-20'), category: 'certs', status: 'expired', uploadedBy: 'Prevención', expiryDate: new Date('2023-08-20'), tags: []
    },
    {
      id: '4', name: 'Matriz de Riesgos Rev3.xlsx', size: '450 KB', type: 'xls',
      uploadDate: new Date('2023-12-05'), category: 'security', status: 'expiring', uploadedBy: 'Prevención', expiryDate: new Date('2023-12-30'), tags: []
    }
  ]);

  totalDocs = computed(() => this.docs().length);
  expiredDocs = computed(() => this.docs().filter(d => d.status === 'expired').length);

  filteredDocs = computed(() => {
    const cat = this.currentCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.docs().filter(doc => {
      const matchCat = cat === 'all' || doc.category === cat;
      const matchSearch = !query || doc.name.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  });

  handleDraggingChange(state: boolean) {
    this.isDragging.set(state);
  }

  handleFile(file: File) {
    this.simulateUpload(file);
  }

  handleDelete(id: string) {
    this.docs.update(current => current.filter(doc => doc.id !== id));
  }

  simulateUpload(file: File) {
    this.isUploading.set(true);
    this.uploadPercent.set(0);
    this.uploadStatusText.set('Encriptando y subiendo...');

    const intervalId = setInterval(() => {
      const next = Math.min(this.uploadPercent() + 10, 100);

      if (next >= 100) {
        clearInterval(intervalId);
        this.uploadPercent.set(100);
        this.processAI(file);
        return;
      }

      if (next < 30) this.uploadStatusText.set('Encriptando y subiendo...');
      else if (next < 70) this.uploadStatusText.set('Analizando con OCR...');
      else this.uploadStatusText.set('Verificando firmas y fechas...');

      this.uploadPercent.set(next);
    }, 300);
  }

  processAI(file: File) {
    setTimeout(() => {
      this.isUploading.set(false);

      const newDoc: DocumentFile = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.name.split('.').pop() || 'file',
        uploadDate: new Date(),
        category: 'legal',
        status: 'valid',
        uploadedBy: 'Tú',
        expiryDate: new Date('2024-12-01'),
        tags: ['Nuevo']
      };

      this.docs.update(current => [newDoc, ...current]);
      this.uploadPercent.set(0);
    }, 1000);
  }
}