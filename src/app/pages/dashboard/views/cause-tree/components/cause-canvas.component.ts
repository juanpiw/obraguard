import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CauseNode } from '../../../../../core/models/cause-tree.model';
import { CauseNodeComponent } from './cause-node.component';

@Component({
  selector: 'app-cause-canvas',
  standalone: true,
  imports: [CommonModule, CauseNodeComponent],
  templateUrl: './cause-canvas.component.html',
  styleUrl: './cause-canvas.component.scss'
})
export class CauseCanvasComponent implements AfterViewInit, OnChanges {
  @Input() tree: CauseNode | null = null;

  @Output() addNode = new EventEmitter<number | string>();
  @Output() editNode = new EventEmitter<CauseNode>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private scrollLeft = 0;
  private scrollTop = 0;

  protected zoom = () => this.zoomValue;
  private zoomValue = 1;
  private readonly zoomMin = 0.5;
  private readonly zoomMax = 2.5;

  // Touch gestures
  private lastTapAt = 0;
  private pinchStartDistance: number | null = null;
  private pinchStartZoom: number | null = null;
  private longPressTimer: number | null = null;
  private touchZoomMode = false;
  private touchZoomStartY = 0;
  private touchZoomStartZoom = 1;

  ngAfterViewInit(): void {
    this.centerRoot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tree'] && !changes['tree'].firstChange) {
      // Mantener la UX de “lienzo infinito”: centra suavemente al actualizar el árbol.
      setTimeout(() => this.centerRoot(), 50);
    }
  }

  protected startDrag(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.node-card') || target.closest('button')) {
      return;
    }
    this.isDragging = true;
    this.startX = event.pageX - this.canvasRef.nativeElement.offsetLeft;
    this.startY = event.pageY - this.canvasRef.nativeElement.offsetTop;
    this.scrollLeft = this.canvasRef.nativeElement.scrollLeft;
    this.scrollTop = this.canvasRef.nativeElement.scrollTop;
    this.canvasRef.nativeElement.classList.add('dragging');
  }

  protected onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const x = event.pageX - this.canvasRef.nativeElement.offsetLeft;
    const y = event.pageY - this.canvasRef.nativeElement.offsetTop;
    const walkX = (x - this.startX) * 1.5;
    const walkY = (y - this.startY) * 1.5;
    this.canvasRef.nativeElement.scrollLeft = this.scrollLeft - walkX;
    this.canvasRef.nativeElement.scrollTop = this.scrollTop - walkY;
  }

  protected endDrag(): void {
    this.isDragging = false;
    this.canvasRef.nativeElement.classList.remove('dragging');
  }

  protected onWheel(event: WheelEvent): void {
    // Zoom intencional: Ctrl+scroll (trackpad pinch suele venir con ctrlKey)
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY;
    const direction = delta > 0 ? -1 : 1;
    const step = 0.1;
    this.setZoom(this.zoomValue + direction * step);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (key === '+' || key === '=' ) {
      event.preventDefault();
      this.setZoom(this.zoomValue + 0.1);
      return;
    }
    if (key === '-' || key === '_') {
      event.preventDefault();
      this.setZoom(this.zoomValue - 0.1);
      return;
    }
    if (key === '0') {
      event.preventDefault();
      this.setZoom(1);
      return;
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    // Doble tap para alternar zoom
    if (event.touches.length === 1) {
      const now = Date.now();
      const dt = now - this.lastTapAt;
      this.lastTapAt = now;
      if (dt > 0 && dt < 280) {
        // Toggle: 1 -> 1.6 -> 1
        this.setZoom(this.zoomValue < 1.2 ? 1.6 : 1);
      }

      // Long press para “modo zoom” (mantener presionado + arrastrar arriba/abajo)
      const target = event.target as HTMLElement | null;
      if (target?.closest('.node-card') || target?.closest('button')) {
        return;
      }
      this.longPressTimer = window.setTimeout(() => {
        this.touchZoomMode = true;
        this.touchZoomStartY = event.touches[0]?.clientY ?? 0;
        this.touchZoomStartZoom = this.zoomValue;
      }, 450);
      return;
    }

    // Pinch: 2 dedos
    if (event.touches.length === 2) {
      this.clearLongPress();
      this.touchZoomMode = false;
      this.pinchStartDistance = this.touchDistance(event.touches[0], event.touches[1]);
      this.pinchStartZoom = this.zoomValue;
    }
  }

  protected onTouchMove(event: TouchEvent): void {
    // Pinch zoom
    if (event.touches.length === 2 && this.pinchStartDistance && this.pinchStartZoom) {
      event.preventDefault();
      const d = this.touchDistance(event.touches[0], event.touches[1]);
      const ratio = d / this.pinchStartDistance;
      this.setZoom(this.pinchStartZoom * ratio);
      return;
    }

    // Long-press zoom mode
    if (event.touches.length === 1 && this.touchZoomMode) {
      event.preventDefault();
      const y = event.touches[0]?.clientY ?? 0;
      const dy = this.touchZoomStartY - y;
      const zoomDelta = dy / 250; // sensibilidad
      this.setZoom(this.touchZoomStartZoom + zoomDelta);
      return;
    }

    // Si el usuario mueve el dedo, cancelamos long-press (para no activar accidentalmente)
    this.clearLongPress();
  }

  protected onTouchEnd(_event: TouchEvent): void {
    this.clearLongPress();
    this.touchZoomMode = false;
    this.pinchStartDistance = null;
    this.pinchStartZoom = null;
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private touchDistance(a: Touch, b: Touch): number {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  private setZoom(value: number): void {
    const clamped = Math.max(this.zoomMin, Math.min(this.zoomMax, Number(value) || 1));
    this.zoomValue = Math.round(clamped * 100) / 100;
  }

  private centerRoot(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    // En row-reverse, el “inicio visual” está a la derecha; este centrado mantiene
    // la raíz visible para discusión retrospectiva.
    canvas.scrollLeft = canvas.scrollWidth / 2;
    canvas.scrollTop = Math.max(0, canvas.scrollTop);
  }
}
