import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CauseChildrenLogic, CauseNode, CauseNodeType } from '../../../../core/models/cause-tree.model';
import { CauseTreeService } from '../../../../core/services/cause-tree.service';
import { CauseCanvasComponent } from './components/cause-canvas.component';
import { NodeModalComponent } from './components/node-modal.component';
import { AiToastComponent } from './components/ai-toast.component';
import { NodeModalMode } from './components/node-modal.component';

const DEMO_TREE: CauseNode = {
  id: 1,
  text: 'Fractura de Cadera Conductor',
  type: 'Accidente',
  children: [
    {
      id: 2,
      text: 'Atropello por Grúa Horquilla',
      type: 'Hecho',
      children: [
        {
          id: 3,
          text: 'Conductor en zona no habilitada',
          type: 'Acción',
          children: [
            {
              id: 4,
              text: 'No recibió instrucción de seguridad',
              type: 'Gestión',
              children: [
                {
                  id: 5,
                  text: 'Inexistencia control de externos',
                  type: 'Gestión',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 6,
          text: 'Falla de frenos Grúa',
          type: 'Condición',
          children: [
            {
              id: 7,
              text: 'Fuga líquido hidráulico',
              type: 'Condición',
              children: [
                {
                  id: 8,
                  text: 'Falta programa mantenimiento',
                  type: 'Gestión',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 9,
          text: 'Operador Grúa distraído',
          type: 'Acción',
          children: [
            {
              id: 10,
              text: 'Presión del supervisor por tiempos',
              type: 'Gestión',
              children: []
            }
          ]
        }
      ]
    }
  ]
};

@Component({
  selector: 'app-cause-tree-page',
  standalone: true,
  imports: [CommonModule, CauseCanvasComponent, NodeModalComponent, AiToastComponent],
  templateUrl: './cause-tree-page.component.html',
  styleUrl: './cause-tree-page.component.scss'
})
export class CauseTreePageComponent {
  private readonly service = inject(CauseTreeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectedTreeId = signal<string | null>(this.route.snapshot.queryParamMap.get('id'));
  private readonly prefillRoot = signal<CauseNode | null>(null);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly tree = signal<CauseNode | null>(null);
  protected readonly aiStatus = signal<'idle' | 'working' | 'done'>('idle');
  protected readonly history = signal<{ id: number | string; hallazgoId?: number | string | null; updatedAt?: string }[]>([]);

  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<NodeModalMode>('add');
  protected readonly modalInitialText = signal('');
  protected readonly modalInitialType = signal<CauseNodeType>('Condición');
  protected readonly modalInitialNotes = signal('');
  protected readonly modalInitialChildrenLogic = signal<CauseChildrenLogic>('AND');

  private readonly modalTargetNodeId = signal<number | string | null>(null);
  private readonly modalParentId = signal<number | string | null>(null);

  protected readonly causeTreeId = computed(() => this.selectedTreeId());

  protected readonly aiTitle = computed(() =>
    this.aiStatus() === 'working' ? 'Generando árbol con IA...' : 'Procesando con IA...'
  );

  protected readonly aiMessage = signal('Detectando palabras clave y variaciones del hallazgo...');

  constructor() {
    this.readPrefillState();
    this.loadHistory();
    this.loadTree(this.causeTreeId());
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        this.selectedTreeId.set(id);
        this.loadTree(id);
      });
  }

  private readPrefillState(): void {
    // En navegación desde hallazgos, mandamos el árbol como state para fallback si el GET falla.
    const browserState =
      typeof window !== 'undefined' ? (window.history.state as unknown) : null;
    const st = (this.router.getCurrentNavigation()?.extras?.state ?? browserState) as any;
    const root = st?.prefillRoot as CauseNode | undefined;
    if (root && typeof root === 'object') {
      this.prefillRoot.set(root);
      // Si no viene id, mostramos inmediatamente el árbol pre-cargado
      if (!this.causeTreeId()) {
        this.tree.set(root);
        this.loading.set(false);
        this.error.set(null);
      }
    }
  }

  protected loadHistory(): void {
    this.service
      .listTrees({ limit: 12 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.history.set(
            items.map((i) => ({
              id: i.id,
              hallazgoId: i.hallazgoId,
              updatedAt: i.updatedAt
            }))
          );
          // Si no hay id seleccionado y tenemos historial, redirigimos al primero
          if (!this.causeTreeId() && !this.prefillRoot() && items[0]?.id) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { id: items[0].id },
              queryParamsHandling: 'merge'
            });
          }
        },
        error: (err) => {
          console.error('[CauseTree][UI] history load error', err);
          this.error.set('No se pudo cargar el historial de árboles.');
        }
      });
  }

  protected loadTree(idParam?: string | null): void {
    this.loading.set(true);
    this.error.set(null);
    const id = idParam ?? this.causeTreeId();
    if (!id) {
      // Si venimos desde hallazgos con state, preferimos ese árbol antes que demo.
      if (this.prefillRoot()) {
        this.tree.set(this.prefillRoot());
        this.loading.set(false);
        return;
      }
      this.error.set('Selecciona o pasa un id de árbol (?id=). Mostrando demo.');
      this.tree.set(DEMO_TREE);
      this.loading.set(false);
      return;
    }

    this.service
      .getTree(id)
      .pipe(
        tap((resp) => this.tree.set(resp.root)),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: (err) => {
          console.error('[CauseTree][UI] tree load error', err);
          if (this.prefillRoot()) {
            this.error.set('No se pudo cargar el árbol guardado. Mostrando árbol pre-cargado desde hallazgo.');
            this.tree.set(this.prefillRoot());
            return;
          }
          this.error.set('No se pudo cargar el árbol. Mostrando datos de ejemplo.');
          this.tree.set(DEMO_TREE);
        }
      });
  }

  protected openAdd(parentId: number | string): void {
    this.error.set(null);
    this.modalMode.set('add');
    this.modalParentId.set(parentId);
    this.modalTargetNodeId.set(null);
    this.modalInitialText.set('');
    this.modalInitialType.set('Condición');
    this.modalInitialNotes.set('');
    this.modalInitialChildrenLogic.set('AND');
    this.modalOpen.set(true);
  }

  protected openEdit(node: CauseNode): void {
    this.error.set(null);
    this.modalMode.set('edit');
    this.modalTargetNodeId.set(node.id);
    this.modalParentId.set(null);
    this.modalInitialText.set(node.text);
    this.modalInitialType.set(node.type);
    this.modalInitialNotes.set(node.notes || '');
    this.modalInitialChildrenLogic.set((node.childrenLogic || 'AND') as CauseChildrenLogic);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected saveNode(payload: {
    text: string;
    type: CauseNodeType;
    notes?: string;
    childrenLogic?: CauseChildrenLogic;
  }): void {
    const current = this.tree();
    if (!current) {
      this.error.set('No hay árbol cargado para editar.');
      return;
    }

    const mode = this.modalMode();
    const updated = this.deepClone(current);

    if (mode === 'add') {
      const parentId = this.modalParentId();
      if (!parentId) {
        this.error.set('No se pudo determinar el nodo padre.');
        return;
      }
      const parent = this.findNode(updated, parentId);
      if (!parent) {
        this.error.set('No se encontró el nodo padre para agregar la causa.');
        return;
      }
      parent.children = parent.children || [];
      parent.children.push({
        id: this.newNodeId(),
        text: payload.text,
        type: payload.type,
        children: [],
        childrenLogic: (payload.childrenLogic || 'AND') as CauseChildrenLogic,
        notes: (payload.notes || '').trim() || null
      });
      // Si el padre tiene más de un hijo, por defecto tratamos como conjunción (AND)
      if ((parent.children?.length || 0) > 1 && !parent.childrenLogic) {
        parent.childrenLogic = 'AND';
      }
    } else {
      const nodeId = this.modalTargetNodeId();
      if (!nodeId) {
        this.error.set('No se pudo determinar el nodo a editar.');
        return;
      }
      const node = this.findNode(updated, nodeId);
      if (!node) {
        this.error.set('No se encontró el nodo a editar.');
        return;
      }
      node.text = payload.text;
      node.type = payload.type;
      node.notes = (payload.notes || '').trim() || null;
      node.childrenLogic = (payload.childrenLogic || node.childrenLogic || 'AND') as CauseChildrenLogic;
    }

    this.tree.set(updated);
    this.closeModal();
    this.persistTree(updated);
  }

  protected generateAiTree(): void {
    const current = this.tree();
    if (!current) {
      this.error.set('No hay árbol para generar.');
      return;
    }

    this.error.set(null);
    this.aiStatus.set('working');
    this.aiMessage.set('Detectando palabras clave y variaciones del hallazgo...');

    window.setTimeout(() => {
      this.aiMessage.set('Correlacionando hechos (cadena / conjunción / disyunción)...');
    }, 900);

    window.setTimeout(() => {
      this.aiMessage.set('Generando borrador inicial de causas previas...');
      const updated = this.deepClone(current);

      // Si está vacío, creamos ramas base (Condición/Acción/Gestión) como borrador.
      if (!updated.children || updated.children.length === 0) {
        updated.children = [
          {
            id: this.newNodeId(),
            text: 'Condición previa (hecho verificable)',
            type: 'Condición',
            children: [],
            childrenLogic: 'AND',
            notes: null
          },
          {
            id: this.newNodeId(),
            text: 'Acción previa (hecho verificable)',
            type: 'Acción',
            children: [],
            childrenLogic: 'AND',
            notes: null
          },
          {
            id: this.newNodeId(),
            text: 'Gestión/organización (hecho verificable)',
            type: 'Gestión',
            children: [],
            childrenLogic: 'AND',
            notes: null
          }
        ];
        updated.childrenLogic = 'AND';
      } else {
        // Si ya hay causas, expandimos 1 nivel para facilitar la discusión.
        updated.childrenLogic = updated.childrenLogic || (updated.children.length > 1 ? 'AND' : 'OR');
        for (const child of updated.children) {
          if (!child.children || child.children.length === 0) {
            child.children = [
              {
                id: this.newNodeId(),
                text: 'Hecho previo (por investigar)',
                type: 'Hecho',
                children: [],
                childrenLogic: 'AND',
                notes: null
              }
            ];
            child.childrenLogic = child.childrenLogic || 'AND';
          }
        }
      }

      this.tree.set(updated);
      this.aiStatus.set('done');
      this.persistTree(updated, {
        source: 'ui_generate_ai_stub',
        action: 'ai_generate',
        stage: 'Etapa4',
        method: 'heuristic'
      });
    }, 2400);
  }

  protected resetTree(): void {
    this.error.set(null);
    this.aiStatus.set('idle');
    const id = this.causeTreeId();
    if (id) {
      this.loadTree(id);
      return;
    }
    if (this.prefillRoot()) {
      this.tree.set(this.prefillRoot());
      return;
    }
    this.tree.set(DEMO_TREE);
  }

  protected selectTree(id: number | string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id },
      queryParamsHandling: 'merge'
    });
  }

  private persistTree(root: CauseNode, meta: Record<string, any> = { source: 'ui_edit' }): void {
    const id = this.causeTreeId();
    if (!id) {
      // Sin id, guardamos solo en memoria (modo prefill/demo)
      return;
    }

    this.saving.set(true);
    this.service
      .updateTree(id, { root, meta })
      .pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.tree.set(resp.root);
          // refrescar historial para ver updatedAt
          this.loadHistory();
        },
        error: (err) => {
          console.error('[CauseTree][UI] save error', err);
          this.error.set('No se pudo guardar el árbol. Revisa conexión o vuelve a intentar.');
        }
      });
  }

  private findNode(node: CauseNode, id: number | string): CauseNode | null {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = this.findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  private deepClone<T>(val: T): T {
    return JSON.parse(JSON.stringify(val)) as T;
  }

  private newNodeId(): string {
    return `n${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}
