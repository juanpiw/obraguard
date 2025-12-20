import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-header.component.html',
  styleUrl: './document-header.component.scss'
})
export class DocumentHeaderComponent {
  @Input() title = 'Gestión Documental';
  @Input() subtitle = 'Repositorio centralizado con validación de vigencia.';
}

