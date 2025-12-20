import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CauseNode } from '../../../../core/models/cause-tree.model';

@Component({
  selector: 'app-cause-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cause-node.component.html',
  styleUrl: './cause-node.component.scss'
})
export class CauseNodeComponent {
  @Input({ required: true }) node!: CauseNode;
  @Input() isRoot = false;

  @Output() addNode = new EventEmitter<number | string>();
  @Output() editNode = new EventEmitter<CauseNode>();

  protected badgeClass(): string {
    switch (this.node.type) {
      case 'Accidente':
        return 'badge-accidente';
      case 'Gestión':
        return 'badge-gestion';
      case 'Condición':
        return 'badge-condicion';
      default:
        return 'badge-hecho';
    }
  }

  protected onAdd(event: Event): void {
    event.stopPropagation();
    this.addNode.emit(this.node.id);
  }

  protected onEdit(): void {
    this.editNode.emit(this.node);
  }
}
