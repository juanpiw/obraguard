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

  ngAfterViewInit(): void {
    this.centerRoot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tree'] && !changes['tree'].firstChange) {
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

  private centerRoot(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.scrollLeft = canvas.scrollWidth / 2;
    canvas.scrollTop = 0;
  }
}
