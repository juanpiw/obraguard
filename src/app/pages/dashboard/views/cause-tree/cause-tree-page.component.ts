import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CauseChildrenLogic, CauseNode, CauseNodeType } from '../../../../core/models/cause-tree.model';
import { CauseTreeReportResponse, CauseTreeService, MeasureItem } from '../../../../core/services/cause-tree.service';
import { HallazgosService, HallazgoGetResponse } from '../../../../core/services/hallazgos.service';
import { CauseCanvasComponent } from './components/cause-canvas.component';
import { NodeModalComponent } from './components/node-modal.component';
import { AiToastComponent } from './components/ai-toast.component';
import { NodeModalMode } from './components/node-modal.component';
import { FactsEditorComponent } from './components/facts-editor.component';
import { FactsLegendComponent } from './components/facts-legend.component';
import { ReportFicha, ReportFichaComponent } from './components/report-ficha.component';
import { ReportRelatoComponent } from './components/report-relato.component';
import { ReportMeasuresComponent } from './components/report-measures.component';

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
  imports: [
    CommonModule,
    FactsEditorComponent,
    FactsLegendComponent,
    ReportFichaComponent,
    ReportRelatoComponent,
    ReportMeasuresComponent,
    CauseCanvasComponent,
    NodeModalComponent,
    AiToastComponent
  ],
  templateUrl: './cause-tree-page.component.html',
  styleUrl: './cause-tree-page.component.scss'
})
export class CauseTreePageComponent {
  private readonly service = inject(CauseTreeService);
  private readonly hallazgos = inject(HallazgosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectedTreeId = signal<string | null>(this.route.snapshot.queryParamMap.get('id'));
  private readonly prefillRoot = signal<CauseNode | null>(null);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly tree = signal<CauseNode | null>(null);
  // Árbol solo para render (numeración + metadatos de UI)
  protected readonly displayTree = computed(() => this.withFactNumbers(this.tree()));
  protected readonly activeHallazgoId = signal<number | string | null>(null);
  protected readonly activeHallazgo = signal<HallazgoGetResponse | null>(null);
  protected readonly aiStatus = signal<'idle' | 'working' | 'done'>('idle');
  protected readonly history = signal<{ id: number | string; hallazgoId?: number | string | null; updatedAt?: string }[]>([]);
  protected readonly pdfWorking = signal(false);

  @ViewChild(CauseCanvasComponent) private canvasCmp?: CauseCanvasComponent;

  // Informe (Ficha/Relato/Medidas) - persistido en DB cuando existe ?id=
  protected readonly reportLoading = signal(false);
  protected readonly reportSaving = signal(false);
  protected readonly report = signal<CauseTreeReportResponse | null>(null);
  protected readonly ficha = signal<ReportFicha>({});
  protected readonly relato = signal<string>('');
  protected readonly measuresLoading = signal(false);
  protected readonly measures = signal<MeasureItem[]>([]);

  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<NodeModalMode>('add');
  protected readonly modalInitialText = signal('');
  protected readonly modalInitialType = signal<CauseNodeType>('Condición');
  protected readonly modalInitialNotes = signal('');
  protected readonly modalInitialChildrenLogic = signal<CauseChildrenLogic>('AND');
  protected readonly modalAiWorking = signal(false);
  protected readonly modalAiPrefillRequestId = signal<number | null>(null);
  protected readonly modalAiPrefillText = signal<string | null>(null);
  protected readonly modalAiPrefillType = signal<CauseNodeType | null>(null);
  protected readonly modalAiPrefillNotes = signal<string | null>(null);
  protected readonly modalAiError = signal<string | null>(null);

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
    const hallazgo = st?.prefillHallazgo as HallazgoGetResponse | undefined;
    if (root && typeof root === 'object') {
      this.prefillRoot.set(root);
      // Si no viene id, mostramos inmediatamente el árbol pre-cargado
      if (!this.causeTreeId()) {
        this.tree.set(root);
        this.loading.set(false);
        this.error.set(null);
      }
    }
    if (hallazgo && typeof hallazgo === 'object') {
      this.activeHallazgo.set(hallazgo);
      this.activeHallazgoId.set((hallazgo as any)?.id ?? null);
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
        tap((resp) => {
          this.tree.set(resp.root);
          this.activeHallazgoId.set((resp as any)?.hallazgoId ?? null);
          // Si no tenemos hallazgo precargado, intentamos cargarlo para el PDF.
          const hid = (resp as any)?.hallazgoId ?? null;
          if (hid && !this.activeHallazgo()) {
            this.hallazgos
              .getHallazgoById(hid)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (h) => this.activeHallazgo.set(h),
                error: () => {
                  // silencioso: PDF puede salir igual sin datos del hallazgo
                }
              });
          }

          // Cargar informe/medidas para este árbol
          this.loadReportAndMeasures(id);
        }),
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

  private loadReportAndMeasures(id: number | string): void {
    if (!id) return;
    this.reportLoading.set(true);
    this.service
      .getReport(id)
      .pipe(finalize(() => this.reportLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.report.set(r);
          this.ficha.set((r?.ficha || {}) as ReportFicha);
          this.relato.set(r?.relato || '');
        },
        error: (err) => {
          console.error('[CauseTree][UI] report load error', err);
          // No bloquea el árbol. Se puede continuar y el PDF saldrá sin ficha/relato.
        }
      });

    this.measuresLoading.set(true);
    this.service
      .listMeasures(id)
      .pipe(finalize(() => this.measuresLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.measures.set(rows || []),
        error: (err) => {
          console.error('[CauseTree][UI] measures load error', err);
        }
      });
  }

  protected saveFicha(ficha: ReportFicha): void {
    const id = this.causeTreeId();
    if (!id) {
      this.ficha.set({ ...(ficha || {}) });
      return;
    }
    this.reportSaving.set(true);
    this.service
      .upsertReport(id, {
        hallazgoId: this.activeHallazgoId() || undefined,
        ficha: ficha || {},
        relato: this.relato() || null
      })
      .pipe(finalize(() => this.reportSaving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.report.set(r);
          this.ficha.set((r?.ficha || {}) as ReportFicha);
          this.relato.set(r?.relato || '');
        },
        error: (err) => {
          console.error('[CauseTree][UI] saveFicha error', err);
          this.error.set(err?.error?.error || err?.message || 'No se pudo guardar la ficha.');
        }
      });
  }

  protected saveRelato(relato: string): void {
    const id = this.causeTreeId();
    this.relato.set(relato || '');
    if (!id) return;
    this.reportSaving.set(true);
    this.service
      .upsertReport(id, {
        hallazgoId: this.activeHallazgoId() || undefined,
        ficha: (this.ficha() || {}) as any,
        relato: relato || null
      })
      .pipe(finalize(() => this.reportSaving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.report.set(r);
          this.ficha.set((r?.ficha || {}) as ReportFicha);
          this.relato.set(r?.relato || '');
        },
        error: (err) => {
          console.error('[CauseTree][UI] saveRelato error', err);
          this.error.set(err?.error?.error || err?.message || 'No se pudo guardar el relato.');
        }
      });
  }

  protected createMeasure(payload: Partial<MeasureItem>): void {
    const id = this.causeTreeId();
    if (!id) return;
    this.measuresLoading.set(true);
    this.service
      .createMeasure(id, {
        causaRaiz: (payload as any)?.causaRaiz || null,
        medidaCorrectiva: String((payload as any)?.medidaCorrectiva || ''),
        responsable: (payload as any)?.responsable || null,
        fechaCompromiso: (payload as any)?.fechaCompromiso || null,
        estado: (payload as any)?.estado || null,
        causeNodeId: (payload as any)?.causeNodeId || null
      })
      .pipe(finalize(() => this.measuresLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadReportAndMeasures(id),
        error: (err) => {
          console.error('[CauseTree][UI] createMeasure error', err);
          this.error.set(err?.error?.error || err?.message || 'No se pudo crear la medida.');
        }
      });
  }

  protected updateMeasure(evt: { id: number | string; patch: Partial<MeasureItem> }): void {
    const id = this.causeTreeId();
    if (!id) return;
    this.measuresLoading.set(true);
    this.service
      .updateMeasure(id, evt.id, {
        causaRaiz: (evt.patch as any)?.causaRaiz || null,
        medidaCorrectiva: (evt.patch as any)?.medidaCorrectiva,
        responsable: (evt.patch as any)?.responsable || null,
        fechaCompromiso: (evt.patch as any)?.fechaCompromiso || null,
        estado: (evt.patch as any)?.estado || null,
        causeNodeId: (evt.patch as any)?.causeNodeId || null
      })
      .pipe(finalize(() => this.measuresLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadReportAndMeasures(id),
        error: (err) => {
          console.error('[CauseTree][UI] updateMeasure error', err);
          this.error.set(err?.error?.error || err?.message || 'No se pudo actualizar la medida.');
        }
      });
  }

  protected deleteMeasure(measureId: number | string): void {
    const id = this.causeTreeId();
    if (!id) return;
    this.measuresLoading.set(true);
    this.service
      .deleteMeasure(id, measureId)
      .pipe(finalize(() => this.measuresLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadReportAndMeasures(id),
        error: (err) => {
          console.error('[CauseTree][UI] deleteMeasure error', err);
          this.error.set(err?.error?.error || err?.message || 'No se pudo eliminar la medida.');
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
    this.modalAiPrefillText.set(null);
    this.modalAiPrefillType.set(null);
    this.modalAiPrefillNotes.set(null);
    this.modalAiPrefillRequestId.set(null);
    this.modalAiError.set(null);
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
    this.modalAiPrefillText.set(null);
    this.modalAiPrefillType.set(null);
    this.modalAiPrefillNotes.set(null);
    this.modalAiPrefillRequestId.set(null);
    this.modalAiError.set(null);
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

    const id = this.causeTreeId();
    if (!id) {
      this.error.set('Primero guarda/abre un árbol existente (necesitamos ?id=) para generar con IA.');
      return;
    }

    this.error.set(null);
    this.aiStatus.set('working');
    this.aiMessage.set('Detectando palabras clave y variaciones del hallazgo...');

    window.setTimeout(() => {
      this.aiMessage.set('Correlacionando hechos (cadena / conjunción / disyunción)...');
    }, 700);

    window.setTimeout(() => {
      this.aiMessage.set('Solicitando borrador a Gemini...');
    }, 1400);

    this.service
      .generateAi(id, { mode: 'overwrite' })
      .pipe(
        finalize(() => {
          // Si falló, volvemos a idle; si tuvo éxito, dejamos done abajo.
          if (this.aiStatus() === 'working') this.aiStatus.set('idle');
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (resp) => {
          this.tree.set(resp.root);
          this.aiStatus.set('done');
          this.aiMessage.set('Árbol generado. Revisa hechos vs. juicios y ajusta con evidencia.');
          this.loadHistory();
        },
        error: (err) => {
          console.error('[CauseTree][UI] ai generate error', err);
          this.error.set('No se pudo generar con IA. Revisa conexión / API key y vuelve a intentar.');
        }
      });
  }

  protected resolveAiFromModal(): void {
    const id = this.causeTreeId();
    if (!id) {
      this.error.set('Primero guarda/abre un árbol existente (necesitamos ?id=) para resolver con IA.');
      return;
    }

    const current = this.tree();
    if (!current) {
      this.error.set('No hay árbol cargado para sugerir una causa.');
      return;
    }

    // Contexto: en "add" sugerimos hijo para el padre; en "edit" sugerimos mejora del nodo actual.
    const mode = this.modalMode();
    const contextNodeId = mode === 'add' ? this.modalParentId() : this.modalTargetNodeId();
    if (!contextNodeId) {
      this.error.set('No se pudo determinar el nodo de contexto para la IA.');
      return;
    }
    const contextNode = this.findNode(current, contextNodeId);
    if (!contextNode) {
      this.error.set('No se encontró el nodo de contexto para la IA.');
      return;
    }

    this.error.set(null);
    this.modalAiError.set(null);
    this.modalAiWorking.set(true);

    console.log('[CauseTree][UI] resolveAiFromModal -> suggestNode start', {
      treeId: id,
      mode,
      contextNodeId,
      parentText: contextNode.text,
      parentType: contextNode.type
    });

    this.service
      .suggestNode(id, {
        parentText: contextNode.text,
        parentType: contextNode.type,
        currentDraft: {
          text: this.modalInitialText(),
          type: this.modalInitialType(),
          notes: this.modalInitialNotes() || null
        }
      })
      .pipe(finalize(() => this.modalAiWorking.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          console.log('[CauseTree][UI] resolveAiFromModal -> suggestNode ok', resp);
          this.modalAiPrefillText.set(resp.text);
          this.modalAiPrefillType.set(resp.type as CauseNodeType);
          this.modalAiPrefillNotes.set(resp.notes || '');
          this.modalAiPrefillRequestId.set(Date.now());
        },
        error: (err) => {
          console.error('[CauseTree][UI] suggest node error', err);
          const msg =
            err?.error?.error ||
            err?.error?.message ||
            err?.message ||
            'No se pudo autocompletar con IA.';
          this.modalAiError.set(msg);
          this.error.set(msg);
        }
      });
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

  protected deleteTree(id: number | string): void {
    if (!id) return;
    const ok = typeof window !== 'undefined' ? window.confirm(`¿Eliminar el árbol #${id}?`) : true;
    if (!ok) return;

    this.error.set(null);
    this.saving.set(true);
    this.service
      .deleteTree(id)
      .pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // si estabas viendo este árbol, quitamos el id para evitar 404
          if (String(this.causeTreeId() || '') === String(id)) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { id: null },
              queryParamsHandling: 'merge'
            });
          }
          this.loadHistory();
        },
        error: (err) => {
          console.error('[CauseTree][UI] delete error', err);
          this.error.set('No se pudo eliminar el árbol. Revisa conexión o vuelve a intentar.');
        }
      });
  }

  protected async exportPdf(): Promise<void> {
    const root = this.displayTree();
    if (!root) {
      this.error.set('No hay árbol para exportar.');
      return;
    }
    this.error.set(null);
    this.pdfWorking.set(true);

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const h = this.activeHallazgo();
      const ficha = this.ficha();
      const relato = this.relato();
      const measures = this.measures();

      const exportEl = this.canvasCmp?.getExportElement();
      if (!exportEl) throw new Error('No se pudo acceder al canvas para exportar.');

      const makeOffscreen = (html: string) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-100000px';
        wrapper.style.top = '0';
        wrapper.style.background = '#ffffff';
        wrapper.style.padding = '24px';
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);
        return wrapper;
      };

      const capture = async (el: HTMLElement, backgroundColor: string, scale = 2) => {
        const canvas = await html2canvas(el, { backgroundColor, scale, useCORS: true });
        return canvas.toDataURL('image/png');
      };

      const addImagePaginated = (pdf: any, imgData: string, orientation: 'portrait' | 'landscape') => {
        const margin = 36;
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgProps = (pdf as any).getImageProperties(imgData);
        const pdfWidth = pageW - margin * 2;
        const pdfHeight = pageH - margin * 2;
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
          pdf.addPage('a4', orientation);
          position = margin - (imgHeight - heightLeft);
          pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      };

      // 1) Portada + Ficha + Relato + Lista de hechos (portrait)
      const legendItems = (() => {
        const out: { n: any; text: string; type: string; status: string }[] = [];
        const walk = (node: CauseNode) => {
          const n = (node?.meta as any)?.['factNumber'];
          const status = ((node?.meta as any)?.['status'] === 'Pendiente' ? 'Pendiente' : 'Confirmado') as string;
          out.push({ n, text: node.text, type: node.type, status });
          for (const c of node.children || []) walk(c);
        };
        for (const c of root.children || []) walk(c);
        return out;
      })();

      const coverHtml = `
        <style>
          *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
          h1{margin:0 0 6px 0;font-size:22px}
          h2{margin:18px 0 8px 0;font-size:16px}
          .muted{color:#475569;font-size:12px}
          .row{display:flex;gap:12px;flex-wrap:wrap}
          .card{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
          .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
          .kv{font-size:12px}
          .kv b{display:block;color:#0f172a}
          .kv span{color:#334155}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th,td{border:1px solid #e2e8f0;padding:6px;vertical-align:top}
          th{background:#f8fafc;text-align:left}
        </style>
        <div class="row" style="align-items:center;justify-content:space-between">
          <div>
            <h1>Informe Investigación Accidente - Árbol de Causas</h1>
            <div class="muted">Árbol ID: ${this.causeTreeId() || 'demo'} ${h?.id ? `| Hallazgo ID: ${h.id}` : ''}</div>
          </div>
          <div class="muted" style="font-weight:700">LOGO</div>
        </div>

        <h2>Ficha</h2>
        <div class="card">
          <div class="grid">
            <div class="kv"><b>Empresa</b><span>${ficha?.empresa || ''}</span></div>
            <div class="kv"><b>Nombre</b><span>${ficha?.nombre || ''}</span></div>
            <div class="kv"><b>RUT</b><span>${ficha?.rut || ''}</span></div>
            <div class="kv"><b>Cargo</b><span>${ficha?.cargo || ''}</span></div>
            <div class="kv"><b>Fecha</b><span>${ficha?.fecha || h?.fecha || ''}</span></div>
            <div class="kv"><b>Hora</b><span>${ficha?.hora || ''}</span></div>
            <div class="kv" style="grid-column:1/-1"><b>Lugar</b><span>${ficha?.lugar || h?.sector || ''}</span></div>
            <div class="kv"><b>Riesgo</b><span>${h?.riesgo || ''}</span></div>
            <div class="kv"><b>Reportado por</b><span>${h?.reporter || ''}</span></div>
          </div>
        </div>

        <h2>Relato</h2>
        <div class="card"><div style="white-space:pre-wrap;font-size:12px;color:#0f172a">${(relato || '').replace(/</g,'&lt;')}</div></div>

        <h2>Lista de Hechos</h2>
        <table>
          <thead><tr><th style="width:60px">#</th><th>Hecho</th><th style="width:110px">Tipo</th><th style="width:110px">Estado</th></tr></thead>
          <tbody>
            ${legendItems.map(it => `<tr><td>${it.n ?? ''}</td><td>${String(it.text||'').replace(/</g,'&lt;')}</td><td>${it.type}</td><td>${it.status}</td></tr>`).join('')}
          </tbody>
        </table>
      `;

      const coverWrap = makeOffscreen(coverHtml);
      const coverImg = await capture(coverWrap, '#ffffff', 2);
      document.body.removeChild(coverWrap);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      addImagePaginated(pdf, coverImg, 'portrait');

      // 2) Diagrama (landscape)
      const prevZoom = this.canvasCmp?.getZoom?.() ?? 1;
      this.canvasCmp?.setZoomPublic?.(1);
      const diagramWrap = document.createElement('div');
      diagramWrap.style.position = 'fixed';
      diagramWrap.style.left = '-100000px';
      diagramWrap.style.top = '0';
      diagramWrap.style.background = '#ffffff';
      diagramWrap.style.padding = '24px';
      diagramWrap.innerHTML = `
        <style>
          .tree-content{zoom:1}
          .connector-h{background:#111827!important}
        </style>
      `;
      const clone = exportEl.cloneNode(true) as HTMLElement;
      clone.style.zoom = '1';
      diagramWrap.appendChild(clone);
      document.body.appendChild(diagramWrap);
      const diagramImg = await capture(diagramWrap, '#ffffff', 2);
      document.body.removeChild(diagramWrap);
      this.canvasCmp?.setZoomPublic?.(prevZoom);

      pdf.addPage('a4', 'landscape');
      addImagePaginated(pdf, diagramImg, 'landscape');

      // 3) Medidas (portrait)
      const measuresHtml = `
        <style>
          *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
          h2{margin:0 0 10px 0;font-size:16px}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th,td{border:1px solid #e2e8f0;padding:6px;vertical-align:top}
          th{background:#f8fafc;text-align:left}
        </style>
        <h2>Medidas de Control</h2>
        <table>
          <thead>
            <tr>
              <th>Causa Raíz</th>
              <th>Medida Correctiva</th>
              <th style="width:160px">Responsable</th>
              <th style="width:110px">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${(measures || []).map(m => `<tr>
              <td>${String(m.causaRaiz || '').replace(/</g,'&lt;')}</td>
              <td>${String(m.medidaCorrectiva || '').replace(/</g,'&lt;')}</td>
              <td>${String(m.responsable || '')}</td>
              <td>${String(m.fechaCompromiso || '')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
      const measWrap = makeOffscreen(measuresHtml);
      const measImg = await capture(measWrap, '#ffffff', 2);
      document.body.removeChild(measWrap);
      pdf.addPage('a4', 'portrait');
      addImagePaginated(pdf, measImg, 'portrait');

      const filename = `informe_arbol-causas_${h?.id ? `hallazgo-${h.id}_` : ''}${this.causeTreeId() || 'demo'}.pdf`;
      pdf.save(filename);
    } catch (err: any) {
      console.error('[CauseTree][UI] exportPdf error', err);
      this.error.set(err?.message || 'No se pudo generar el PDF.');
    } finally {
      this.pdfWorking.set(false);
    }
  }

  protected onFactsGenerate(evt: { root: CauseNode; meta?: Record<string, any> }): void {
    const root = evt?.root;
    if (!root) return;
    this.tree.set(root);
    this.persistTree(root, evt?.meta || { source: 'facts_editor' });
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

  private withFactNumbers(root: CauseNode | null): CauseNode | null {
    if (!root) return null;
    const cloned = this.deepClone(root);

    let counter = 1;
    const walk = (node: CauseNode, isRoot = false) => {
      node.meta = node.meta || {};
      if (isRoot) {
        (node.meta as any)['factNumber'] = (node.meta as any)['factNumber'] ?? 0;
      } else {
        if ((node.meta as any)['factNumber'] == null) {
          (node.meta as any)['factNumber'] = counter;
        }
        counter += 1;
      }
      for (const c of node.children || []) walk(c, false);
    };

    walk(cloned, true);
    return cloned;
  }

  private newNodeId(): string {
    return `n${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}
