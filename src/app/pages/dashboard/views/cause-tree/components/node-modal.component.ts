import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CauseNodeType } from '../../../../../core/models/cause-tree.model';
import { FormsModule } from '@angular/forms';

export type NodeModalMode = 'add' | 'edit';

@Component({
  selector: 'app-node-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './node-modal.component.html',
  styleUrl: './node-modal.component.scss'
})
export class NodeModalComponent implements OnChanges {
  @Input() open = false;
  @Input() mode: NodeModalMode = 'add';
  @Input() saving = false;
  @Input() initialText = '';
  @Input() initialType: CauseNodeType = 'Condición';

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ text: string; type: CauseNodeType }>();

  protected text = '';
  protected selectedType: CauseNodeType = 'Condición';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.text = this.initialText || '';
      this.selectedType = this.initialType || 'Condición';
    }
  }

  protected setType(type: CauseNodeType): void {
    this.selectedType = type;
  }

  protected handleSave(): void {
    if (!this.text.trim()) return;
    this.save.emit({ text: this.text.trim(), type: this.selectedType });
  }
}
