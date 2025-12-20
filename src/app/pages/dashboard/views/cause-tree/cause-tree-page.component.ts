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
import { CauseNode } from '../../../../core/models/cause-tree.model';
import { CauseTreeService } from '../../../../core/services/cause-tree.service';
import { CauseCanvasComponent } from './components/cause-canvas.component';
import { NodeModalComponent } from './components/node-modal.component';
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

  protected readonly causeTreeId = computed(() => this.selectedTreeId());

  protected readonly aiTitle = computed(() =>
    this.aiStatus() === 'working' ? 'Generando árbol con IA...' : 'Procesando con IA...'
  );

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
    const st = (this.router.getCurrentNavigation()?.extras?.state ?? history.state) as any;
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

  protected openAdd(): void {
    this.error.set('Edición de árbol no disponible en esta vista.');
  }

  protected openEdit(): void {
    this.error.set('Edición de árbol no disponible en esta vista.');
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected saveNode(): void {
    this.error.set('Edición de árbol no disponible en esta vista.');
  }

  protected generateAiTree(): void {
    this.error.set('Generar con IA no está disponible todavía.');
  }

  protected resetTree(): void {
    this.error.set('Reinicio no disponible en esta vista.');
  }

  protected selectTree(id: number | string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id },
      queryParamsHandling: 'merge'
    });
  }
}
