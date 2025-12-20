import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MeasureItem } from '../../../../../core/services/cause-tree.service';

type EditableMeasure = MeasureItem & { _localId?: string };

@Component({
  selector: 'app-report-measures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-measures.component.html',
  styleUrl: './report-measures.component.scss'
})
export class ReportMeasuresComponent {
  @Input() disabled = false;
  @Input() measures: EditableMeasure[] = [];

  @Output() create = new EventEmitter<Partial<MeasureItem>>();
  @Output() update = new EventEmitter<{ id: number | string; patch: Partial<MeasureItem> }>();
  @Output() remove = new EventEmitter<number | string>();

  protected addRow(): void {
    const local: EditableMeasure = {
      id: `new_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      causeTreeId: '',
      causeNodeId: null,
      causaRaiz: '',
      medidaCorrectiva: '',
      responsable: '',
      fechaCompromiso: null,
      estado: null,
      _localId: 'new'
    };
    this.measures = [local, ...this.measures];
  }

  protected saveRow(m: EditableMeasure): void {
    const isNew = String(m.id).startsWith('new_');
    const payload: any = {
      causeNodeId: m.causeNodeId || null,
      causaRaiz: m.causaRaiz || null,
      medidaCorrectiva: m.medidaCorrectiva || '',
      responsable: m.responsable || null,
      fechaCompromiso: m.fechaCompromiso || null,
      estado: m.estado || null
    };
    if (isNew) {
      this.create.emit(payload);
    } else {
      this.update.emit({ id: m.id, patch: payload });
    }
  }
}



