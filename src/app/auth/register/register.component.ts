import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly registerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    terms: [false, [Validators.requiredTrue]]
  });

  protected isSubmitting = false;

  protected get firstNameControl() {
    return this.registerForm.get('firstName');
  }

  protected get lastNameControl() {
    return this.registerForm.get('lastName');
  }

  protected get emailControl() {
    return this.registerForm.get('email');
  }

  protected get passwordControl() {
    return this.registerForm.get('password');
  }

  protected get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }

  protected get termsControl() {
    return this.registerForm.get('terms');
  }

  protected get passwordMismatch(): boolean {
    const password = this.passwordControl?.value;
    const confirmPassword = this.confirmPasswordControl?.value;
    return !!password && !!confirmPassword && password !== confirmPassword;
  }

  protected onSubmit(): void {
    if (this.registerForm.invalid || this.passwordMismatch) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    setTimeout(() => {
      this.isSubmitting = false;
      console.table(this.registerForm.value);
    }, 800);
  }
}
