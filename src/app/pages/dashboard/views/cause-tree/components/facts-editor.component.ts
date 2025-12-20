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
  parent?: string; // 'root' o id de otro hecho (ej: f3)
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
  protected parentLogic: Record<string, CauseChildrenLogic> = {};

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
      notes: '',
      parent: 'root'
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

    // Construimos nodos y relaciones (Etapa 4): el usuario define padre por hecho
    const nodesById = new Map<string, CauseNode>();
    const ordered = (this.items || []).map((it) => ({
      ...it,
      factId: `f${it.id}`
    }));

    for (const it of ordered) {
      const txt = String(it.text || '').trim();
      if (!txt) continue;
      const notes =
        it.status === 'Pendiente'
          ? String(it.notes || '').trim() || 'Pendiente de investigación'
          : String(it.notes || '').trim() || null;
      nodesById.set(it.factId, {
        id: it.factId,
        text: txt,
        type: it.type,
        children: [],
        childrenLogic: 'AND',
        notes,
        meta: {
          source: 'facts_editor',
          status: it.status,
          factNumber: it.id
        }
      });
    }

    // root
    const root: CauseNode = {
      id: 'root',
      text: rootText,
      type: 'Accidente',
      children: [],
      childrenLogic: 'AND',
      notes: null,
      meta: { source: 'facts_editor', factNumber: 0 }
    };

    // armar aristas padre->hijo
    for (const it of ordered) {
      const child = nodesById.get(it.factId);
      if (!child) continue;
      const parentId = String(it.parent || 'root');
      if (parentId === 'root') {
        root.children.push(child);
      } else {
        const parent = nodesById.get(parentId);
        // evitar ciclos obvios (si el parent no existe, cae al root)
        if (!parent || parent.id === child.id) {
          root.children.push(child);
        } else {
          parent.children.push(child);
        }
      }
    }

    // aplicar lógica AND/OR por cada padre (incluyendo root)
    root.childrenLogic = (this.parentLogic['root'] || (root.children.length > 1 ? 'AND' : 'OR')) as CauseChildrenLogic;
    for (const [id, node] of nodesById.entries()) {
      const logic = this.parentLogic[id];
      node.childrenLogic = (logic || (node.children.length > 1 ? 'AND' : 'OR')) as CauseChildrenLogic;
    }

    this.generate.emit({ root, meta: { source: 'facts_editor', action: 'generate_from_facts' } });
    this.dirty = false;
  }

  protected uniqueParents(): { id: string; label: string }[] {
    const parents = new Map<string, string>();
    parents.set('root', 'Accidente (raíz)');
    for (const it of this.items) {
      const fid = `f${it.id}`;
      const label = `${it.id}. ${String(it.text || '').slice(0, 40) || '(sin texto)'}`;
      parents.set(fid, label);
    }
    return Array.from(parents.entries()).map(([id, label]) => ({ id, label }));
  }

  private loadFromTree(tree: CauseNode | null): void {
    const t = tree || null;
    if (!t) {
      this.accidentText = '';
      this.items = [];
      this.parentLogic = {};
      return;
    }
    this.accidentText = String(t.text || '').trim();

    // Aplanamos el árbol (excepto root) para editar (Etapa 3)
    const out: FactItem[] = [];
    const parentLogic: Record<string, CauseChildrenLogic> = {};
    parentLogic['root'] = (t.childrenLogic || (t.children?.length > 1 ? 'AND' : 'OR')) as CauseChildrenLogic;

    let nextN = 1;
    const walk = (node: CauseNode, parentId: string) => {
      const n = (node?.meta as any)?.['factNumber'];
      const idNum = typeof n === 'number' && Number.isFinite(n) ? n : nextN++;
      const status = ((node?.meta as any)?.['status'] === 'Pendiente' ? 'Pendiente' : 'Confirmado') as FactStatus;
      out.push({
        id: idNum,
        text: String(node.text || '').trim(),
        type: (node.type || 'Hecho') as CauseNodeType,
        status,
        notes: String(node.notes || '').trim(),
        parent: parentId
      });
      if (node.children && node.children.length) {
        parentLogic[String(node.id)] = (node.childrenLogic || (node.children.length > 1 ? 'AND' : 'OR')) as CauseChildrenLogic;
      }
      for (const c of node.children || []) walk(c, String(node.id));
    };
    for (const c of t.children || []) walk(c, 'root');
    // ordenar por id numérico
    out.sort((a, b) => a.id - b.id);
    this.items = out;
    this.parentLogic = parentLogic;
  }
}





