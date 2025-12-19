import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly loginForm: FormGroup = this.fb.group({
    email: [''],
    password: ['']
  });

  protected isSubmitting = false;

  protected get emailControl() {
    return this.loginForm.get('email');
  }

  protected get passwordControl() {
    return this.loginForm.get('password');
  }

  protected onSubmit(): void {
    this.isSubmitting = true;
    this.router.navigateByUrl('/app/dashboard').finally(() => {
      this.isSubmitting = false;
    });
  }
}
