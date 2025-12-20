import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CauseChildrenLogic, CauseNodeType } from '../../../../../core/models/cause-tree.model';
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
  @Input() aiEnabled = true;
  @Input() aiWorking = false;
  @Input() aiPrefillRequestId: number | null = null;
  @Input() aiPrefillText: string | null = null;
  @Input() aiPrefillType: CauseNodeType | null = null;
  @Input() aiPrefillNotes: string | null = null;
  @Input() initialText = '';
  @Input() initialType: CauseNodeType = 'Condición';
  @Input() initialNotes = '';
  @Input() initialChildrenLogic: CauseChildrenLogic = 'AND';

  @Output() cancel = new EventEmitter<void>();
  @Output() resolveAi = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    text: string;
    type: CauseNodeType;
    notes?: string;
    childrenLogic?: CauseChildrenLogic;
  }>();

  protected text = '';
  protected selectedType: CauseNodeType = 'Condición';
  protected notes = '';
  protected childrenLogic: CauseChildrenLogic = 'AND';
  private lastAiPrefillRequestId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.text = this.initialText || '';
      this.selectedType = this.initialType || 'Condición';
      this.notes = this.initialNotes || '';
      this.childrenLogic = this.initialChildrenLogic || 'AND';
    }

    // Cuando llega una sugerencia IA, autocompletamos sin cerrar el modal
    if (this.open && changes['aiPrefillRequestId']) {
      const rid = this.aiPrefillRequestId;
      if (rid != null && rid !== this.lastAiPrefillRequestId) {
        this.lastAiPrefillRequestId = rid;
        if (this.aiPrefillText != null) this.text = this.aiPrefillText;
        if (this.aiPrefillType != null) this.selectedType = this.aiPrefillType;
        if (this.aiPrefillNotes != null) this.notes = this.aiPrefillNotes;
      }
    }
  }

  protected setType(type: CauseNodeType): void {
    this.selectedType = type;
  }

  protected setChildrenLogic(value: CauseChildrenLogic): void {
    this.childrenLogic = value;
  }

  protected showJudgementWarning(): boolean {
    return this.looksLikeJudgementOrInterpretation(this.text);
  }

  protected moveTextToNotes(): void {
    const t = this.text.trim();
    if (!t) return;
    this.notes = `${this.notes ? `${this.notes}\n\n` : ''}${t}`;
    this.text = '';
  }

  protected handleSave(): void {
    if (!this.text.trim()) return;
    this.save.emit({
      text: this.text.trim(),
      type: this.selectedType,
      notes: this.notes.trim(),
      childrenLogic: this.childrenLogic
    });
  }

  protected handleResolveAi(): void {
    if (!this.aiEnabled || this.aiWorking || this.saving) return;
    this.resolveAi.emit();
  }

  private looksLikeJudgementOrInterpretation(text: string): boolean {
    const t = String(text || '').toLowerCase();
    // Palabras típicas de juicio/culpabilidad (no deben ir como hecho probado)
    if (/(culpa|culpable|negligenc|irresponsable|descuidado|imprudente|peligroso|mala suerte)/i.test(t)) {
      return true;
    }
    // Ejemplo clásico: “estaba distraído” → pedir hecho observable
    if (/distra[ií]d/.test(t)) return true;
    return false;
  }
}
