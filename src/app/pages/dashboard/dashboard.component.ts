import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { DashboardSidebarComponent } from './components/sidebar/sidebar.component';
import { DashboardHeaderComponent } from './components/header/header.component';
import { HallazgoModalComponent } from './components/hallazgo-modal/hallazgo-modal.component';
import { DashboardToastComponent } from './components/dashboard-toast/dashboard-toast.component';

interface DashboardLink {
  label: string;
  route: string;
  icon: 'dashboard' | 'hallazgos' | 'documentos' | 'equipo' | 'incidentes';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DashboardSidebarComponent,
    DashboardHeaderComponent,
    HallazgoModalComponent,
    DashboardToastComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnDestroy {
  protected readonly links: DashboardLink[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Incidentes', route: '/app/incidentes', icon: 'incidentes' },
    { label: 'Hallazgos', route: '/app/hallazgos', icon: 'hallazgos' },
    { label: 'Documentos', route: '/app/documentos', icon: 'documentos' },
    { label: 'Equipo', route: '/app/equipo', icon: 'equipo' }
  ];

  protected readonly pageTitle = signal('Dashboard');
  protected readonly mobileMenuOpen = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly toastVisible = signal(false);
  protected readonly toastMessage = signal('');

  private readonly subscriptions = new Subscription();
  private toastTimeoutId: number | undefined;

  constructor(private readonly router: Router) {
    const sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const tree = this.router.parseUrl(this.router.url);
        const current = this.links.find((link) => tree.toString().startsWith(link.route));
        this.pageTitle.set(current?.label ?? 'Dashboard');
        this.mobileMenuOpen.set(false);
      });

    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.toastTimeoutId) {
      window.clearTimeout(this.toastTimeoutId);
    }
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected openModal(): void {
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected handleModalSubmit(message: string): void {
    this.modalOpen.set(false);
    this.toastMessage.set(message);
    this.toastVisible.set(true);

    if (this.toastTimeoutId) {
      window.clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = window.setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }

  protected dismissToast(): void {
    if (this.toastTimeoutId) {
      window.clearTimeout(this.toastTimeoutId);
    }

    this.toastVisible.set(false);
  }
}





