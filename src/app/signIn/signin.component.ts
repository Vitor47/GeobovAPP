import { Component, OnInit, inject, NO_ERRORS_SCHEMA, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import {
  ActionBarComponent,
  NativeScriptFormsModule,
  NativeScriptRouterModule,
  RouterExtensions,
} from "@nativescript/angular";

import { HealthService } from "../services/health.service";
import { UserService } from "../services/user.service";

import { Toasty } from "@triniwiz/nativescript-toasty";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "ns-login",
  templateUrl: "./signin.component.html",
  styleUrls: ["./signin.component.scss"],
  standalone: true,
  imports: [
    NativeScriptRouterModule,
    ReactiveFormsModule,
    NativeScriptFormsModule,
    ActionBarComponent,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SignInComponent implements OnInit {
  form = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
    password: new FormControl("", [Validators.required]),
  });

  private router = inject(RouterExtensions);
  private user = inject(UserService);
  private health = inject(HealthService);

  apiStatus = signal<"unknown" | "ok" | "down">("unknown");

  get email() {
    return this.form.get("email")!;
  }

  get password() {
    return this.form.get("password")!;
  }

  isLogin = signal(false);
  isError = signal(false);

  ngOnInit() {
    void this.pingApi();
  }

  private async pingApi() {
    try {
      const health = await firstValueFrom(this.health.check());
      const checks = health?.checks;
      const degraded =
        !!checks &&
        [checks.database, checks.redis, checks.mongo].some((item) => item === false);
      this.apiStatus.set(health?.status === "ok" && !degraded ? "ok" : "down");
    } catch {
      this.apiStatus.set("down");
    }
  }

  async onLogin() {
    if (this.form.valid) {
      this.isLogin.set(true);

      try {
        await this.user.Login(this.email.value!, this.password.value!);

        this.router.navigate(["/home"], { clearHistory: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha inesperada no login.";
        new Toasty({ text: message }).show();
      } finally {
        this.isLogin.set(false);
      }
    } else {
      this.form.markAllAsTouched();
    }
  }
}
