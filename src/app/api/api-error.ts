import { HttpErrorResponse } from "@angular/common/http";

import { environment } from "../../environments/environment";

function readDetail(error: HttpErrorResponse): string | null {
  const detail = error.error?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.msg === "string") return item.msg;
        return null;
      })
      .filter((item): item is string => !!item);
    if (parts.length) return parts.join(" ");
  }

  return null;
}

export function messageFromUnknown(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const detail = readDetail(error);

    if (error.status === 0) {
      return environment.production
        ? "Não foi possível conectar à API de produção. Verifique a internet."
        : "Não foi possível conectar à API. Verifique se ela está rodando e o endereço em environment.ts.";
    }

    if (detail) return detail;

    if (error.status === 429) {
      return "Muitas tentativas. Aguarde cerca de 15 minutos e tente de novo.";
    }
    if (error.status === 401) return fallback;
    if (error.status === 403) return "Sem permissão para esta operação.";
    if (error.status === 404) return "Não encontrado.";
    if (error.status === 422) return "Dados rejeitados pela API.";

    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
