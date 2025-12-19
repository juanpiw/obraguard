import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { HallazgosService } from '../../../../core/services/hallazgos.service';
import { HallazgoRiesgo } from '../../../../core/models/hallazgo.model';

const REPORTERO_DEFAULT = 'Carolina Vega (Prevencionista)';
type CaptureMode = 'upload' | 'camera';

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
  protected readonly captureMode = signal<CaptureMode>('upload');
  protected readonly mediaPreview = signal<string | null>(null);
  protected readonly mediaName = signal<string | null>(null);
  protected readonly mediaIsImage = signal(true);

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

  protected analyzeRisk(): void {
    const titulo = this.form.get('titulo')?.value?.trim();
    if (!titulo) {
      this.form.get('titulo')?.markAsTouched();
      return;
    }

    this.aiLoading.set(true);
    this.aiMessage.set(null);

    window.setTimeout(() => {
      const { riesgo, justification } =
        this.hallazgosService.analyzeRisk(titulo);
      this.form.get('riesgo')?.setValue(riesgo);
      this.aiMessage.set(justification);
      this.aiLoading.set(false);
    }, 1200);
  }

  protected handleSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const reporter = this.anonimo
      ? 'Anónimo'
      : this.form.get('reportero')?.value || REPORTERO_DEFAULT;

    const hallazgo = this.hallazgosService.addHallazgo({
      titulo: this.form.get('titulo')?.value ?? '',
      riesgo: (this.form.get('riesgo')?.value ?? 'Medio') as HallazgoRiesgo,
      sector: this.form.get('sector')?.value ?? '',
      reportero: reporter
    });

    this.submitted.emit(`Hallazgo "${hallazgo.titulo}" reportado con éxito.`);
    this.form.reset({
      titulo: '',
      riesgo: 'Medio',
      sector: '',
      anonimo: false,
      reportero: REPORTERO_DEFAULT
    });
    this.aiMessage.set(null);
    this.clearMedia();
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

  protected onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.clearMedia();
      return;
    }

    this.mediaName.set(file.name);
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
  }
}

