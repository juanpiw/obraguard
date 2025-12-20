import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CauseNode,
  CauseNodeType
} from '../../../../core/models/cause-tree.model';
import { CauseTreeService } from '../../../../core/services/cause-tree.service';
import { CauseCanvasComponent } from './components/cause-canvas.component';
import { NodeModalComponent, NodeModalMode } from './components/node-modal.component';
import { AiToastComponent } from './components/ai-toast.component';

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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly tree = signal<CauseNode | null>(null);
  protected readonly aiStatus = signal<'idle' | 'working' | 'done'>('idle');

  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<NodeModalMode>('add');
  protected readonly editing = signal<{
    nodeId?: number | string;
    parentId?: number | string;
    text: string;
    type: CauseNodeType;
  } | null>(null);

  protected readonly investigationId = computed(
    () => this.route.snapshot.queryParamMap.get('id') ?? '1'
  );

  protected readonly aiTitle = computed(() =>
    this.aiStatus() === 'working' ? 'Generando árbol con IA...' : 'Procesando con IA...'
  );

  constructor() {
    this.loadTree();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadTree());
  }

  protected loadTree(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service
      .getTree(this.investigationId())
      .pipe(
        tap((tree) => this.tree.set(tree)),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.error.set('No se pudo cargar el árbol. Mostrando datos de ejemplo.');
          this.tree.set(DEMO_TREE);
        }
      });
  }

  protected openAdd(parentId: number | string): void {
    this.modalMode.set('add');
    this.editing.set({ parentId, text: '', type: 'Condición' });
    this.modalOpen.set(true);
  }

  protected openEdit(node: CauseNode): void {
    this.modalMode.set('edit');
    this.editing.set({
      nodeId: node.id,
      text: node.text,
      type: node.type
    });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.editing.set(null);
  }

  protected saveNode(payload: { text: string; type: CauseNodeType }): void {
    const edit = this.editing();
    if (!edit) return;
    const mode = this.modalMode();
    this.saving.set(true);

    const request$ =
      mode === 'add'
        ? this.service.addNode(this.investigationId(), edit.parentId!, payload)
        : this.service.updateNode(this.investigationId(), edit.nodeId!, payload);

    request$
      .pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tree) => {
          this.tree.set(tree);
          this.closeModal();
          this.error.set(null);
        },
        error: () => {
          this.error.set('No se pudo guardar el nodo. Intenta nuevamente.');
        }
      });
  }

  protected generateAiTree(): void {
    this.aiStatus.set('working');
    this.service
      .generateAiTree(this.investigationId())
      .pipe(finalize(() => this.aiStatus.set('done')), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tree) => {
          this.tree.set(tree);
          setTimeout(() => this.aiStatus.set('idle'), 800);
        },
        error: () => {
          this.aiStatus.set('idle');
          this.error.set('No se pudo generar el árbol con IA.');
        }
      });
  }

  protected resetTree(): void {
    this.loading.set(true);
    this.service
      .resetTree(this.investigationId())
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tree) => {
          this.tree.set(tree);
          this.error.set(null);
        },
        error: () => {
          this.error.set('No se pudo reiniciar el árbol.');
        }
      });
  }
}
