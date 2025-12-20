import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CauseNode } from '../../../../../core/models/cause-tree.model';

type LegendItem = {
  n: number;
  text: string;
  type: string;
  status: 'Confirmado' | 'Pendiente';
};

@Component({
  selector: 'app-facts-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './facts-legend.component.html',
  styleUrl: './facts-legend.component.scss'
})
export class FactsLegendComponent {
  @Input() tree: CauseNode | null = null;

  protected get items(): LegendItem[] {
    const root = this.tree;
    if (!root) return [];
    const out: LegendItem[] = [];
    let idx = 1;
    const walk = (node: CauseNode, isRoot = false) => {
      if (!isRoot) {
        const status = ((node?.meta as any)?.['status'] === 'Pendiente' ? 'Pendiente' : 'Confirmado') as
          | 'Confirmado'
          | 'Pendiente';
        out.push({
          n: (node?.meta as any)?.['factNumber'] || idx,
          text: String(node.text || ''),
          type: String(node.type || ''),
          status
        });
        idx += 1;
      }
      for (const c of node.children || []) walk(c, false);
    };
    // listamos solo “hechos” (todos los nodos excepto raíz), en DFS para referencia rápida
    for (const c of root.children || []) walk(c, false);
    return out;
  }
}





