import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CauseNode } from '../../../../../core/models/cause-tree.model';

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

  protected circleClass(): string {
    const status = ((this.node?.meta as any)?.['status'] || '').toString();
    if (status === 'Pendiente') return 'circle-pendiente';
    if (this.isRoot || this.node.type === 'Accidente') return 'circle-accidente';
    // Hechos/Condiciones/Acciones/Gestión: código simple azul/verde
    if (this.node.type === 'Gestión') return 'circle-gestion';
    if (this.node.type === 'Condición') return 'circle-condicion';
    if (this.node.type === 'Acción') return 'circle-accion';
    return 'circle-hecho';
  }

  protected displayNumber(): string {
    if (this.isRoot || this.node.type === 'Accidente') return 'A';
    const n = (this.node?.meta as any)?.['factNumber'];
    if (typeof n === 'number' && Number.isFinite(n)) return String(n);
    if (typeof n === 'string' && n.trim()) return n.trim();
    return '?';
  }

  protected onAdd(event: Event): void {
    event.stopPropagation();
    this.addNode.emit(this.node.id);
  }

  protected onEdit(): void {
    this.editNode.emit(this.node);
  }
}

