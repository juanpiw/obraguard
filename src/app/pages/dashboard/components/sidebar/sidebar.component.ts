import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarLink {
  label: string;
  route: string;
  icon: 'dashboard' | 'hallazgos' | 'documentos' | 'equipo' | 'incidentes' | 'causas';
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class DashboardSidebarComponent {
  @Input() links: SidebarLink[] = [];
  @Input() variant: 'desktop' | 'mobile' = 'desktop';

  @Output() navigate = new EventEmitter<void>();

  private readonly router = inject(Router);

  protected readonly profileMenuOpen = signal(false);

  protected handleNavigate(): void {
    this.navigate.emit();
  }

  protected toggleProfileMenu(event?: Event): void {
    event?.stopPropagation();
    this.profileMenuOpen.update((v) => !v);
  }

  protected closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    if (this.profileMenuOpen()) {
      this.closeProfileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeProfileMenu();
  }

  protected async goToLanding(): Promise<void> {
    this.closeProfileMenu();
    this.handleNavigate();
    await this.router.navigateByUrl('/');
  }

  protected async logout(): Promise<void> {
    // Hoy el login no persiste sesión, pero limpiamos keys típicas por seguridad.
    try {
      const keys = ['token', 'access_token', 'auth_token', 'jwt', 'guest_id'];
      keys.forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
    } catch {
      // ignore
    }

    await this.goToLanding();
  }

  protected iconPath(icon: SidebarLink['icon']): string {
    switch (icon) {
      case 'dashboard':
        return 'M3.75 13.5l10.5-11.25L12 3c-1.135 0-2.19.405-3 1.125L3 9.75v3.75zM3.75 13.5L9 18.75m0 0L21 9.75M9 18.75V21c1.135 0 2.19-.405 3-1.125L18 13.5m0-3.75L9.75 3.75M3 12h18';
      case 'hallazgos':
        return 'M12 9v3.75m0-10.036V9m0 3.75M3.28 5.776a7.5 7.5 0 0111.44 0 7.5 7.5 0 01-11.44 0zM12 21.75a7.5 7.5 0 00-7.22-4.975M12 21.75a7.5 7.5 0 017.22-4.975';
      case 'documentos':
        return 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m-1.125 0H6.75A2.25 2.25 0 004.5 4.5v15A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 18.75v-2.625m-3.75-10.5a3.375 3.375 0 00-3.375-3.375H8.25m1.125 0v1.5a1.125 1.125 0 01-1.125 1.125h-1.5';
      case 'incidentes':
        return 'M15 17h5l-1.405-1.405A1.993 1.993 0 0118 14.16V11a6 6 0 00-12 0v3.16c0 .53-.211 1.039-.586 1.415L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
      case 'causas':
        return 'M8.25 6.75a3.75 3.75 0 117.5 0v3a3.75 3.75 0 01-7.5 0v-3zM12 13.5v4.25m0 0l-2.25-2.25M12 17.75l2.25-2.25';
      case 'equipo':
      default:
        return 'M18 18.72a9.094 9.094 0 00-3.17-2.131m-5.66 0a9.094 9.094 0 01-3.17 2.131M15 9.75a3 3 0 11-6 0 3 3 0 016 0z';
    }
  }
}





