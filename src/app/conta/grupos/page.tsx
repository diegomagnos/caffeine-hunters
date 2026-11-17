"use client";
import { RequireAuth, useAuth } from "@/modules/auth/provider";
import { MyGroups } from "@/modules/groups/groups";
export default function GroupsPage() {
  const { user } = useAuth();
  return (
    <>
      <h1>Meus grupos</h1>
      <RequireAuth>
        <MyGroups key={user?.id} />
      </RequireAuth>
    </>
  );
}
