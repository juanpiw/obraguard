import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { HallazgosService } from '../../../../core/services/hallazgos.service';
import { HallazgoRiesgo } from '../../../../core/models/hallazgo.model';
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

  protected readonly aiLoading = signal(false);
  protected readonly aiMessage = signal<string | null>(null);
  protected readonly aiDescripcion = signal<string | null>(null);
  protected readonly aiRiesgo = signal<HallazgoRiesgo | null>(null);
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

  protected readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(6)]],
    riesgo: ['Medio' as HallazgoRiesgo, Validators.required],
    sector: ['', [Validators.required, Validators.minLength(3)]],
    anonimo: [false],
    reportero: [{ value: REPORTERO_DEFAULT, disabled: true }]
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
      control.setValue(REPORTERO_DEFAULT);
    }
  }

  protected async analyzeRisk(): Promise<void> {
    if (!this.selectedFile) {
      this.aiMessage.set('Sube o captura una evidencia antes de analizar.');
      return;
    }

    this.aiLoading.set(true);
    this.aiMessage.set(null);
    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      const resp = await firstValueFrom(this.hallazgosService.analyzeEvidence(formData));
      this.form.get('riesgo')?.setValue(resp.riesgo);
      this.aiMessage.set(resp.descripcion);
      this.aiDescripcion.set(resp.descripcion);
      this.aiRiesgo.set(resp.riesgo);
      this.analyzedMediaId = resp.mediaId ?? null;
      this.analyzedMediaUrl = resp.mediaUrl ?? null;
      this.analyzedDescripcion = resp.descripcion ?? null;
    } catch (err: any) {
      this.aiMessage.set(err?.message || 'No se pudo analizar la evidencia.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  protected toggleSubmitOptions(): void {
    this.showSubmitOptions.update((v) => !v);
  }

  protected async handleSubmit(mode: 'normal' | 'telefono' | 'arbol' = 'normal'): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const reporter = this.anonimo
      ? 'Anónimo'
      : this.form.get('reportero')?.value || REPORTERO_DEFAULT;

    try {
      const payload = {
        titulo: this.form.get('titulo')?.value ?? '',
        riesgo: (this.form.get('riesgo')?.value ?? 'Medio') as HallazgoRiesgo,
        sector: this.form.get('sector')?.value ?? '',
        reportero: reporter,
        anonimo: this.anonimo,
        descripcion_ai: this.analyzedDescripcion ?? undefined,
        mediaId: this.analyzedMediaId ?? undefined,
        meta: mode
      };

      await firstValueFrom(this.hallazgosService.createHallazgo(payload));

      this.submitted.emit(
        mode === 'telefono'
          ? `Hallazgo "${payload.titulo}" enviado para gestión telefónica.`
          : mode === 'arbol'
            ? `Hallazgo "${payload.titulo}" enviado con árbol de causa.`
            : `Hallazgo "${payload.titulo}" reportado con éxito.`
      );
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

  protected onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.clearMedia();
      return;
    }

    this.mediaName.set(file.name);
    this.selectedFile = file;
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
}

