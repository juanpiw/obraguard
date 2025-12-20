import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-upload-zone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-upload-zone.component.html',
  styleUrl: './document-upload-zone.component.scss'
})
export class DocumentUploadZoneComponent {
  @Input() isDragging = false;
  @Input() isUploading = false;
  @Input() uploadPercent = 0;
  @Input() uploadStatusText = 'Iniciando carga...';

  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileDropped = new EventEmitter<File>();
  @Output() draggingChange = new EventEmitter<boolean>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.draggingChange.emit(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.draggingChange.emit(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.draggingChange.emit(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileDropped.emit(file);
    }
  }

  triggerSelect() {
    this.fileInput?.nativeElement.click();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
      input.value = '';
    }
  }
}

