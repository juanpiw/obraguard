import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ai-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-toast.component.html',
  styleUrl: './ai-toast.component.scss'
})
export class AiToastComponent {
  @Input() title = 'Procesando con IA...';
  @Input() message = 'Analizando hallazgo y correlacionando causas.';
  @Input() visible = false;
}

