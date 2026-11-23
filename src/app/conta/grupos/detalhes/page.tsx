import { Suspense } from "react";
import { GroupDetailsPage } from "@/modules/groups/details";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Carregando grupo…</p>}>
      <GroupDetailsPage />
    </Suspense>
  );
}
