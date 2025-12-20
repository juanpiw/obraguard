import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CauseChildrenLogic, CauseNode, CauseNodeType } from '../../../../../core/models/cause-tree.model';

type FactStatus = 'Confirmado' | 'Pendiente';

export interface FactItem {
  id: number;
  text: string;
  type: CauseNodeType;
  status: FactStatus;
  notes?: string;
}

@Component({
  selector: 'app-facts-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facts-editor.component.html',
  styleUrl: './facts-editor.component.scss'
})
export class FactsEditorComponent implements OnChanges {
  @Input() tree: CauseNode | null = null;
  @Input() disabled = false;

  @Output() generate = new EventEmitter<{ root: CauseNode; meta?: Record<string, any> }>();

  protected accidentText = '';
  protected items: FactItem[] = [];
  protected dirty = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tree'] && !this.dirty) {
      this.loadFromTree(this.tree);
    }
  }

  protected addFact(): void {
    this.dirty = true;
    const nextId = (this.items[this.items.length - 1]?.id || 0) + 1;
    this.items.push({
      id: nextId,
      text: '',
      type: 'Hecho',
      status: 'Confirmado',
      notes: ''
    });
  }

  protected removeFact(id: number): void {
    this.dirty = true;
    this.items = this.items.filter((i) => i.id !== id);
  }

  protected moveUp(idx: number): void {
    if (idx <= 0) return;
    this.dirty = true;
    const copy = [...this.items];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    this.items = copy;
  }

  protected moveDown(idx: number): void {
    if (idx >= this.items.length - 1) return;
    this.dirty = true;
    const copy = [...this.items];
    [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
    this.items = copy;
  }

  protected resetFromTree(): void {
    this.dirty = false;
    this.loadFromTree(this.tree);
  }

  protected markDirty(): void {
    this.dirty = true;
  }

  protected handleGenerate(): void {
    if (this.disabled) return;
    const rootText = String(this.accidentText || '').trim() || (this.tree?.text || 'Accidente');
    const children = (this.items || [])
      .map((it, idx) => ({
        id: `f${idx + 1}`,
        text: String(it.text || '').trim(),
        type: it.type,
        children: [] as CauseNode[],
        childrenLogic: 'AND' as CauseChildrenLogic,
        notes: it.status === 'Pendiente' ? (String(it.notes || '').trim() || 'Pendiente de investigación') : (String(it.notes || '').trim() || null),
        meta: { status: it.status, source: 'facts_editor' }
      }))
      .filter((n) => !!n.text);

    const root: CauseNode = {
      id: 'root',
      text: rootText,
      type: 'Accidente',
      children,
      childrenLogic: (children.length > 1 ? 'AND' : 'OR') as CauseChildrenLogic,
      notes: null,
      meta: { source: 'facts_editor' }
    };

    this.generate.emit({ root, meta: { source: 'facts_editor', action: 'generate_from_facts' } });
    this.dirty = false;
  }

  private loadFromTree(tree: CauseNode | null): void {
    const t = tree || null;
    if (!t) {
      this.accidentText = '';
      this.items = [];
      return;
    }
    this.accidentText = String(t.text || '').trim();
    const children = Array.isArray(t.children) ? t.children : [];
    this.items = children.map((c, idx) => ({
      id: idx + 1,
      text: String(c.text || '').trim(),
      type: (c.type || 'Hecho') as CauseNodeType,
      status: ((c?.meta as any)?.['status'] === 'Pendiente' ? 'Pendiente' : 'Confirmado') as FactStatus,
      notes: String(c.notes || '').trim()
    }));
  }
}

