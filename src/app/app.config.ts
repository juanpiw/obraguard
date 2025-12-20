import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

function routerLoggingFactory(router: Router): () => void {
  return () => {
    router.events.subscribe((evt) => {
      if (evt instanceof NavigationStart) {
        console.log('[Router] NavigationStart', { id: evt.id, url: evt.url, ts: performance.now() });
      } else if (evt instanceof NavigationEnd) {
        console.log('[Router] NavigationEnd', { id: evt.id, url: evt.urlAfterRedirects, ts: performance.now() });
      } else if (evt instanceof NavigationCancel) {
        console.warn('[Router] NavigationCancel', { id: evt.id, url: evt.url, ts: performance.now(), reason: evt.reason });
      } else if (evt instanceof NavigationError) {
        console.error('[Router] NavigationError', { id: evt.id, url: evt.url, ts: performance.now(), error: evt.error?.message || evt.error });
      }
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    {
      provide: APP_INITIALIZER,
      useFactory: routerLoggingFactory,
      deps: [Router],
      multi: true
    }
  ]
};
