import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { HallazgosService } from '../../../../core/services/hallazgos.service';
import { HallazgoRiesgo } from '../../../../core/models/hallazgo.model';
import { CauseNode, CauseChildrenLogic } from '../../../../core/models/cause-tree.model';
import { firstValueFrom } from 'rxjs';

const REPORTERO_DEFAULT = 'Carolina Vega (Prevencionista)';
type CaptureMode = 'upload' | 'camera';
type FormTab = 'manual' | 'auto';

@Component({
  selector: 'app-hallazgo-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hallazgo-modal.component.html',
  styleUrl: './hallazgo-modal.component.scss'
})
export class HallazgoModalComponent {
  @Input() open = false;

  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<string>();

  private readonly fb = inject(FormBuilder);
  private readonly hallazgosService = inject(HallazgosService);
  private readonly router = inject(Router);

  protected readonly aiLoading = signal(false);
  protected readonly aiMessage = signal<string | null>(null);
  protected readonly aiDescripcion = signal<string | null>(null);
  protected readonly aiRiesgo = signal<HallazgoRiesgo | null>(null);
  protected readonly aiCausas = signal<string[]>([]);
  protected readonly submitting = signal(false);
  protected readonly captureMode = signal<CaptureMode>('upload');
  protected readonly activeTab = signal<FormTab>('manual');
  protected readonly mediaPreview = signal<string | null>(null);
  protected readonly mediaName = signal<string | null>(null);
  protected readonly mediaIsImage = signal(true);
  private selectedFile: File | null = null;
  private analyzedMediaId: number | null = null;
  private analyzedMediaUrl: string | null = null;
  private analyzedDescripcion: string | null = null;
  protected readonly showSubmitOptions = signal(false);
  protected readonly selectedSubmitOption = signal<'normal' | 'telefono' | 'arbol' | 'matriz'>('matriz');

  protected readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(6)]],
    riesgo: ['Medio' as HallazgoRiesgo, Validators.required],
    // Sector puede ser opcional (pero si se completa debe tener minLength)
    sector: ['', [Validators.minLength(3)]],
    anonimo: [false],
    reportero: [REPORTERO_DEFAULT]
  });

  protected get anonimo(): boolean {
    return this.form.get('anonimo')?.value ?? false;
  }

  protected onToggleAnonimo(): void {
    const control = this.form.get('reportero');
    if (!control) {
      return;
    }

    if (this.anonimo) {
      control.disable();
    } else {
      control.enable();
      if (!control.value) {
        control.setValue(REPORTERO_DEFAULT);
      }
    }
  }

  protected async analyzeRisk(): Promise<void> {
    console.log('[Hallazgos][IA] Click analizar IA');
    if (!this.selectedFile) {
      this.aiMessage.set('Sube o captura una evidencia antes de analizar.');
      this.aiLoading.set(false);
      return;
    }

    this.aiLoading.set(true);
    this.aiMessage.set(null);
    try {
      console.log('[Hallazgos][IA] Iniciando análisis de evidencia...');
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      const resp = await firstValueFrom(this.hallazgosService.analyzeEvidence(formData));
      console.log('[Hallazgos][IA] Respuesta', resp);
      this.form.get('riesgo')?.setValue(resp.riesgo);

      // Auto completar título si el usuario aún no lo ingresó
      const tituloCtrl = this.form.get('titulo');
      const currentTitulo = String(tituloCtrl?.value || '').trim();
      if (tituloCtrl && !currentTitulo) {
        const suggested =
          String((resp as any)?.titulo || '').trim() ||
          this.buildTitleFromDescripcion(resp.descripcion);
        if (suggested) {
          tituloCtrl.setValue(suggested);
        }
      }

      this.aiMessage.set(resp.descripcion);
      this.aiDescripcion.set(resp.descripcion);
      this.aiRiesgo.set(resp.riesgo);
      this.aiCausas.set(resp.causas || []);
      this.analyzedMediaId = resp.mediaId ?? null;
      this.analyzedMediaUrl = resp.mediaUrl ?? null;
      this.analyzedDescripcion = resp.descripcion ?? null;
    } catch (err: any) {
      console.error('[Hallazgos][IA] Error', err);
      this.aiMessage.set(err?.message || 'No se pudo analizar la evidencia.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  protected toggleSubmitOptions(): void {
    console.log('[Hallazgos][UI] Toggle opciones de envío');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.logInvalidForm('normal');
      return;
    }

    // En modo manual, el objetivo es simplemente "Enviar reporte" (sin modal intermedio).
    if (this.activeTab() === 'manual') {
      void this.handleSubmit('normal');
      return;
    }

    this.selectedSubmitOption.set('matriz');
    this.showSubmitOptions.update((v) => !v);
  }

  protected setSubmitOption(option: 'normal' | 'telefono' | 'arbol' | 'matriz'): void {
    console.log('[Hallazgos][UI] Opción seleccionada', option);
    this.selectedSubmitOption.set(option);
  }

  protected confirmSubmit(): void {
    const option = this.selectedSubmitOption();
    console.log('[Hallazgos][UI] Confirmar envío', option);
    this.showSubmitOptions.set(false);
    this.handleSubmit(option);
  }

  protected async handleSubmit(mode: 'normal' | 'telefono' | 'arbol' | 'matriz' = 'normal'): Promise<void> {
    console.log('[Hallazgos][UI] handleSubmit start', mode);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.logInvalidForm(mode);
      return;
    }

    this.submitting.set(true);
    const reporter = this.anonimo
      ? 'Anónimo'
      : this.form.get('reportero')?.value || REPORTERO_DEFAULT;

    try {
      const rootJson = this.buildRootJson();
      const payload = {
        titulo: this.form.get('titulo')?.value ?? '',
        riesgo: (this.form.get('riesgo')?.value ?? 'Medio') as HallazgoRiesgo,
        sector: this.form.get('sector')?.value ?? '',
        reporter,
        anonimo: this.anonimo,
        descripcion_ai: this.analyzedDescripcion ?? undefined,
        causas: this.aiCausas() ?? [],
        mediaId: this.analyzedMediaId ?? undefined,
        meta: mode,
        root_json: mode === 'arbol' ? rootJson : undefined
      };

      console.log('[Hallazgos][UI] payload', { mode, payload });
      const saved = await firstValueFrom(this.hallazgosService.createHallazgo(payload));
      console.log('[Hallazgos][UI] handleSubmit success', { mode, saved });

      if (mode === 'telefono') {
        try {
          console.log('[Hallazgos][UI] notify SMS start', { hallazgoId: saved?.id });
          const sms = await firstValueFrom(this.hallazgosService.notifyHallazgoSms(saved.id));
          console.log('[Hallazgos][UI] notify SMS success', sms);
          this.submitted.emit(`Hallazgo "${payload.titulo}" enviado por SMS al equipo.`);
        } catch (smsErr: any) {
          console.error('[Hallazgos][UI] notify SMS error', smsErr);
          this.submitted.emit(
            `Hallazgo "${payload.titulo}" guardado, pero no se pudo enviar SMS. Revisa configuración de Twilio en el backend.`
          );
        }
      }

      if (mode === 'arbol') {
        const causeTreeId = saved?.causeTreeId ?? null;
        if (!causeTreeId) {
          console.error('[Hallazgos][UI] No causeTreeId returned, navigating with prefill', { saved });
          void this.router.navigate(['/app/arbol-causas'], {
            state: { prefillRoot: rootJson, prefillHallazgo: saved }
          });
          this.submitted.emit(
            `Hallazgo "${payload.titulo}" creado, pero no se pudo guardar el árbol. Abriendo árbol con datos pre-cargados.`
          );
        } else {
          console.log('[Hallazgos][UI] navigate to arbol-causas', { causeTreeId });
          void this.router.navigate(['/app/arbol-causas'], {
            queryParams: { id: causeTreeId },
            state: { prefillRoot: rootJson, prefillHallazgo: saved }
          });
          this.submitted.emit(`Hallazgo "${payload.titulo}" enviado con árbol de causa.`);
        }
      } else if (mode !== 'telefono') {
        this.submitted.emit(`Hallazgo "${payload.titulo}" reportado con éxito.`);
      }
      this.form.reset({
        titulo: '',
        riesgo: 'Medio',
        sector: '',
        anonimo: false,
        reportero: REPORTERO_DEFAULT
      });
      this.aiMessage.set(null);
      this.clearMedia();
    } catch (err: any) {
      console.error('[Hallazgos][UI] handleSubmit error', err);
      this.aiMessage.set(err?.message || 'No se pudo enviar el hallazgo.');
    } finally {
      this.submitting.set(false);
      this.showSubmitOptions.set(false);
    }
  }

  protected requestClose(): void {
    this.close.emit();
    this.aiLoading.set(false);
    this.clearMedia();
  }

  protected setCaptureMode(mode: CaptureMode): void {
    this.captureMode.set(mode);
  }

  protected isActiveMode(mode: CaptureMode): boolean {
    return this.captureMode() === mode;
  }

  protected setTab(tab: FormTab): void {
    this.activeTab.set(tab);
  }

  protected isActiveTab(tab: FormTab): boolean {
    return this.activeTab() === tab;
  }

  protected onDescripcionChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.aiDescripcion.set(value);
    this.analyzedDescripcion = value;
  }

  protected proposeImprovements(): void {
    console.log('[Hallazgos][IA] Proponer mejoras click', {
      descripcionActual: this.aiDescripcion(),
      riesgoActual: this.aiRiesgo()
    });
  }

  private buildRootJson(): CauseNode {
    const titulo = this.form.get('titulo')?.value || 'Hallazgo';
    const riesgo = (this.form.get('riesgo')?.value ?? 'Medio') as HallazgoRiesgo;
    const descripcion = this.aiDescripcion() || this.form.get('titulo')?.value || '';
    const sector = this.form.get('sector')?.value || '';
    const causes = this.aiCausas();

    const children: CauseNode[] =
      (causes || []).length > 0
        ? (causes || []).map((c, idx) => ({
            id: `c${idx + 1}`,
            text: c,
            type: 'Hecho',
            children: [],
            childrenLogic: 'AND' as CauseChildrenLogic,
            notes: null,
            meta: { source: 'hallazgo_ai_causa' }
          }))
        : [
            {
              id: 'c1',
              text: sector ? `Visto en ${sector}` : 'Causa pendiente de análisis',
              type: 'Hecho',
              children: [],
              childrenLogic: 'AND' as CauseChildrenLogic,
              notes: null,
              meta: { source: 'hallazgo_fallback' }
            }
          ];

    return {
      id: 'root',
      text: descripcion || titulo,
      type: riesgo === 'Alto' ? 'Accidente' : 'Hecho',
      children,
      // Por defecto, si hay múltiples causas sugeridas, asumimos conjunción (AND)
      childrenLogic: (children.length > 1 ? 'AND' : 'OR') as CauseChildrenLogic,
      notes: null,
      meta: {
        source: 'hallazgo_modal',
        titulo,
        riesgo,
        sector: sector || null,
        mediaId: this.analyzedMediaId ?? null,
        mediaUrl: this.analyzedMediaUrl ?? null
      }
    };
  }

  private buildTitleFromDescripcion(descripcion: string | null | undefined): string {
    const text = String(descripcion || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';

    // Tomamos primeras palabras como título corto
    const words = text.split(' ').slice(0, 10).join(' ').trim();
    const compact = words.replace(/[.。]+$/g, '').trim();
    if (compact.length >= 6) return compact;

    // fallback simple
    return text.slice(0, 60).trim();
  }

  protected onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.clearMedia();
      return;
    }

    this.mediaName.set(file.name);
    this.selectedFile = file;
    console.log('[Hallazgos][IA] Archivo seleccionado', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    const isImage = file.type.startsWith('image/');
    this.mediaIsImage.set(isImage);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        this.mediaPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.mediaPreview.set(null);
    }
  }

  protected clearMedia(): void {
    this.mediaName.set(null);
    this.mediaPreview.set(null);
    this.mediaIsImage.set(true);
    this.selectedFile = null;
    this.analyzedMediaId = null;
    this.analyzedMediaUrl = null;
    this.analyzedDescripcion = null;
    this.aiDescripcion.set(null);
    this.aiRiesgo.set(null);
    this.aiMessage.set(null);
  }

  private logInvalidForm(mode: 'normal' | 'telefono' | 'arbol' | 'matriz'): void {
    const controls = this.form.controls as Record<string, any>;
    const invalid: Record<string, unknown> = {};
    for (const key of Object.keys(controls)) {
      const c = controls[key];
      if (c?.invalid) {
        invalid[key] = {
          value: c?.value,
          errors: c?.errors
        };
      }
    }
    console.warn('[Hallazgos][UI] form invalid - cannot submit', {
      mode,
      invalid,
      rawValue: this.form.getRawValue()
    });
  }
}

