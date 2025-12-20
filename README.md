# Front
==================================================================================
se logoeaaa con cualquier correo o pass

==========================================================================
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

- Desarrollo rápido (sin SSR ni prerender):  
  `npm run build -- --configuration development --no-progress`

- Producción (SSR/prerender desactivados para acelerar):  
  `npm run build -- --configuration production`

Si aparece `Could not find '@angular-devkit/build-angular:application'` o errores EPERM sobre `esbuild.exe`, borra `node_modules` y reinstala:
```
rmdir /s /q node_modules
npm ci --no-audit --progress=false
```

## Notas de rendimiento y CI
- SSR y prerender están desactivados en `angular.json` para acortar los builds.
- Las vistas pesadas del dashboard se cargan con `loadComponent` (lazy load) para reducir el bundle inicial.
- En Amplify, usa `npm ci --no-audit --progress=false` y cachea `node_modules`, `.npm`, `.angular/cache` (ver `amplify.yml`). BaseDirectory esperado: `dist/front/browser`.
- Usa el registro oficial: `npm config set registry https://registry.npmjs.org/`.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
