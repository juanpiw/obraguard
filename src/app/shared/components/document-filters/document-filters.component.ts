import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocCategory } from '../../models/document.model';

interface DocCategoryOption {
  id: DocCategory;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-document-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-filters.component.html',
  styleUrl: './document-filters.component.scss'
})
export class DocumentFiltersComponent {
  @Input() categories: DocCategoryOption[] = [];
  @Input() currentCategory: DocCategory = 'all';
  @Input() searchQuery = '';

  @Output() categoryChange = new EventEmitter<DocCategory>();
  @Output() searchChange = new EventEmitter<string>();

  onCategoryClick(id: DocCategory) {
    this.categoryChange.emit(id);
  }

  onSearchChange(value: string) {
    this.searchChange.emit(value ?? '');
  }
}

