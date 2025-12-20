import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
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
  private draggingPointerType: 'mouse' | 'touch' | null = null;
  private isRowReverse = true;
  private readonly onWindowMouseMove = (e: MouseEvent) => this.onDrag(e);
  private readonly onWindowMouseUp = (_e: MouseEvent) => this.endDrag();

  protected zoom = () => this.zoomValue;
  private zoomValue = 1;
  private readonly zoomMin = 0.5;
  private readonly zoomMax = 2.5;

  // Touch gestures
  private lastTapAt = 0;
  private pinchStartDistance: number | null = null;
  private pinchStartZoom: number | null = null;
  private touchDragging = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchScrollLeft = 0;
  private touchScrollTop = 0;
  private lastWheelLog = 0;
  private lastTouchLog = 0;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    console.log('[CauseCanvas] ngAfterViewInit start');
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.isRowReverse = getComputedStyle(canvas).flexDirection === 'row-reverse';
    }
    this.centerRoot();
    console.log('[CauseCanvas] ngAfterViewInit done', {
      isRowReverse: this.isRowReverse,
      scrollLeft: this.canvasRef?.nativeElement.scrollLeft,
      scrollTop: this.canvasRef?.nativeElement.scrollTop,
      scrollWidth: this.canvasRef?.nativeElement.scrollWidth,
      clientWidth: this.canvasRef?.nativeElement.clientWidth
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tree'] && !changes['tree'].firstChange) {
      // Mantener la UX de “lienzo infinito”: centra suavemente al actualizar el árbol.
      setTimeout(() => this.centerRoot(), 50);
    }
  }

  protected startDrag(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Evitar iniciar pan al interactuar con nodos/botones.
    if (target.closest('.node-card') || target.closest('.node-circle') || target.closest('button')) {
      return;
    }
    this.isDragging = true;
    this.draggingPointerType = 'mouse';
    this.startX = event.pageX - this.canvasRef.nativeElement.offsetLeft;
    this.startY = event.pageY - this.canvasRef.nativeElement.offsetTop;
    this.scrollLeft = this.canvasRef.nativeElement.scrollLeft;
    this.scrollTop = this.canvasRef.nativeElement.scrollTop;
    this.canvasRef.nativeElement.classList.add('dragging');

    // Mantener el arrastre aunque el mouse salga del contenedor.
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  protected onDrag(event: MouseEvent): void {
    if (!this.isDragging || this.draggingPointerType !== 'mouse') return;
    event.preventDefault();
    const x = event.pageX - this.canvasRef.nativeElement.offsetLeft;
    const y = event.pageY - this.canvasRef.nativeElement.offsetTop;
    const dx = x - this.startX;
    const dy = y - this.startY;
    // En row-reverse el scrollLeft suele comportarse “invertido”.
    const dirX = this.isRowReverse ? 1 : -1;
    this.canvasRef.nativeElement.scrollLeft = this.scrollLeft + dx * dirX;
    // Vertical siempre natural
    this.canvasRef.nativeElement.scrollTop = this.scrollTop - dy;
  }

  protected endDrag(): void {
    this.isDragging = false;
    this.draggingPointerType = null;
    this.canvasRef.nativeElement.classList.remove('dragging');
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
  }

  protected onWheel(event: WheelEvent): void {
    // Zoom intencional: Ctrl+scroll (trackpad pinch suele venir con ctrlKey)
    if (!event.ctrlKey && !event.metaKey) return;
    const now = performance.now();
    if (now - this.lastWheelLog > 300) {
      this.lastWheelLog = now;
      console.log('[CauseCanvas] onWheel zoom', { deltaY: event.deltaY, ctrl: event.ctrlKey, meta: event.metaKey });
    }
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
    console.log('[CauseCanvas] onTouchStart', { touches: event.touches.length });
    // Doble tap para alternar zoom
    if (event.touches.length === 1) {
      const now = Date.now();
      const dt = now - this.lastTapAt;
      this.lastTapAt = now;
      if (dt > 0 && dt < 280) {
        // Toggle: 1 -> 1.6 -> 1
        this.setZoom(this.zoomValue < 1.2 ? 1.6 : 1);
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('.node-card') || target?.closest('.node-circle') || target?.closest('button')) {
        return;
      }

      // Pan con 1 dedo: mantener presionado y arrastrar (lienzo infinito).
      this.touchDragging = true;
      this.draggingPointerType = 'touch';
      this.touchStartX = event.touches[0]?.clientX ?? 0;
      this.touchStartY = event.touches[0]?.clientY ?? 0;
      this.touchScrollLeft = this.canvasRef.nativeElement.scrollLeft;
      this.touchScrollTop = this.canvasRef.nativeElement.scrollTop;
      this.canvasRef.nativeElement.classList.add('dragging');
      return;
    }

    // Pinch: 2 dedos
    if (event.touches.length === 2) {
      this.touchDragging = false;
      this.draggingPointerType = null;
      this.canvasRef.nativeElement.classList.remove('dragging');
      this.pinchStartDistance = this.touchDistance(event.touches[0], event.touches[1]);
      this.pinchStartZoom = this.zoomValue;
    }
  }

  protected onTouchMove(event: TouchEvent): void {
    const now = performance.now();
    if (now - this.lastTouchLog > 200) {
      this.lastTouchLog = now;
      console.log('[CauseCanvas] onTouchMove', { touches: event.touches.length, dragging: this.touchDragging });
    }
    // Pinch zoom
    if (event.touches.length === 2 && this.pinchStartDistance && this.pinchStartZoom) {
      event.preventDefault();
      const d = this.touchDistance(event.touches[0], event.touches[1]);
      const ratio = d / this.pinchStartDistance;
      this.setZoom(this.pinchStartZoom * ratio);
      return;
    }

    // Pan con 1 dedo
    if (event.touches.length === 1 && this.touchDragging && this.draggingPointerType === 'touch') {
      event.preventDefault();
      const x = event.touches[0]?.clientX ?? 0;
      const y = event.touches[0]?.clientY ?? 0;
      const dx = x - this.touchStartX;
      const dy = y - this.touchStartY;
      const dirX = this.isRowReverse ? 1 : -1;
      this.canvasRef.nativeElement.scrollLeft = this.touchScrollLeft + dx * dirX;
      this.canvasRef.nativeElement.scrollTop = this.touchScrollTop - dy;
      return;
    }
  }

  protected onTouchEnd(_event: TouchEvent): void {
    console.log('[CauseCanvas] onTouchEnd');
    this.touchDragging = false;
    this.draggingPointerType = null;
    this.canvasRef.nativeElement.classList.remove('dragging');
    this.pinchStartDistance = null;
    this.pinchStartZoom = null;
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

  public getZoom(): number {
    return this.zoomValue;
  }

  public setZoomPublic(value: number): void {
    this.setZoom(value);
  }

  public getExportElement(): HTMLElement | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return null;
    return canvas.querySelector('.tree-content') as HTMLElement | null;
  }

  private centerRoot(): void {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    // En row-reverse, el “inicio visual” está a la derecha; este centrado mantiene
    // la raíz visible para discusión retrospectiva.
    canvas.scrollLeft = canvas.scrollWidth / 2;
    canvas.scrollTop = Math.max(0, canvas.scrollTop);
  }
}


