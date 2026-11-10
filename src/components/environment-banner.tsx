"use client";
import { usePathname } from "next/navigation";
export function EnvironmentBanner() {
  const account = usePathname().startsWith("/conta");
  return (
    <div className="demo-banner">
      <strong>{account ? "Área de conta" : "Ambiente demonstrativo"}</strong>
      <span>
        {account
          ? "Acesso pessoal · separado da demonstração"
          : "Dados fictícios · sem gravação de dados de grupos"}
      </span>
    </div>
  );
}
