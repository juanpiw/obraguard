import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DocumentFile, DocStatus, DocCategory } from '../../models/document.model';

interface CategoryOption {
  id: DocCategory;
  label: string;
}

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './document-table.component.html',
  styleUrl: './document-table.component.scss'
})
export class DocumentTableComponent {
  @Input() documents: DocumentFile[] = [];
  @Input() categories: CategoryOption[] = [];
  @Output() deleteDoc = new EventEmitter<string>();

  getCategoryLabel(catId: DocCategory) {
    return this.categories.find(c => c.id === catId)?.label || catId;
  }

  getFileIconColor(type: string) {
    const normalized = type.toLowerCase();
    if (normalized.includes('pdf')) return 'file-icon file-icon--pdf';
    if (normalized.includes('xls') || normalized.includes('xlsx')) return 'file-icon file-icon--xls';
    if (normalized.includes('doc')) return 'file-icon file-icon--doc';
    if (normalized.includes('dwg')) return 'file-icon file-icon--cad';
    return 'file-icon file-icon--default';
  }

  getStatusClass(status: DocStatus) {
    switch (status) {
      case 'valid': return 'status-chip status-chip--valid';
      case 'expiring': return 'status-chip status-chip--expiring';
      case 'expired': return 'status-chip status-chip--expired';
      default: return 'status-chip';
    }
  }

  getStatusDot(status: DocStatus) {
    switch (status) {
      case 'valid': return 'status-chip__dot status-chip__dot--valid';
      case 'expiring': return 'status-chip__dot status-chip__dot--expiring';
      case 'expired': return 'status-chip__dot status-chip__dot--expired';
      default: return 'status-chip__dot';
    }
  }

  statusLabel(status: DocStatus) {
    if (status === 'valid') return 'Vigente';
    if (status === 'expiring') return 'Por Vencer';
    if (status === 'expired') return 'Vencido';
    return 'Procesando IA...';
  }

  onDelete(id: string) {
    this.deleteDoc.emit(id);
  }
}

