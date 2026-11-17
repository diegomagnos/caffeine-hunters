import { getAuthClient } from "@/modules/auth/client";

export type Group = {
  id: string;
  name: string;
  description: string;
  founder_id: string;
  owner_id: string;
};

export async function listMyGroups(): Promise<Group[]> {
  // A participação é filtrada pelo PostgreSQL/RLS usando a identidade do JWT.
  const { data, error } = await getAuthClient()!
    .from("groups")
    .select("id,name,description,founder_id,owner_id")
    .order("created_at", { ascending: false })
    .order("id");
  if (error || !data) throw new Error("groups_read_failed");
  return data;
}

export async function createGroup(name: string, description: string) {
  const { data, error } = await getAuthClient()!.rpc("create_group", {
    group_name: name.trim(),
    group_description: description.trim(),
  });
  if (error || !data) throw new Error("group_create_failed");
}
