import { inject, NgModule } from "@angular/core";
import { Routes } from "@angular/router";
import {
  NativeScriptRouterModule,
  RouterExtensions,
} from "@nativescript/angular";

import { HomeComponent } from "./home/home.component";
import { UserService } from "./services/user.service";
import { SignInComponent } from "./signIn/signin.component";

const routes: Routes = [
  { path: "", redirectTo: "/signin", pathMatch: "full" },
  {
    path: "signin",
    component: SignInComponent,
    canActivate: [
      () => {
        const user = inject(UserService);
        const router = inject(RouterExtensions);

        if (user.isLogin()) {
          router.navigate(["/home"], { clearHistory: true });
          return false;
        }

        return true;
      },
    ],
  },
  {
    path: "home",
    component: HomeComponent,
    canActivate: [
      () => {
        const user = inject(UserService);
        const router = inject(RouterExtensions);

        if (!user.isLogin()) {
          router.navigate(["/signin"], { clearHistory: true });
          return false;
        }

        return true;
      },
    ],
  },
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule],
})
export class AppRoutingModule {}
