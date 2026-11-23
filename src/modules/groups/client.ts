import { getAuthClient } from "@/modules/auth/client";

const groupFields = "id,name,description,founder_id,owner_id";

export type Group = {
  id: string;
  name: string;
  description: string;
  founder_id: string;
  owner_id: string;
};

type GroupMembership = { is_admin: boolean };
export type MyGroup = Group & { membership: GroupMembership[] };
type GroupMember = GroupMembership & {
  user_id: string;
  display_name: string | null;
};
export type GroupDetails = { group: Group; members: GroupMember[] };

export function groupDetailsHref(groupId: string) {
  return `/conta/grupos/detalhes/?id=${encodeURIComponent(groupId)}` as const;
}

export function describeGroupRole(
  group: Group,
  userId: string,
  isAdmin: boolean,
) {
  const role =
    group.owner_id === userId
      ? "Dono · Administrador"
      : isAdmin
        ? "Administrador"
        : "Participante";
  return group.founder_id === userId ? `Fundador · ${role}` : role;
}

export async function listMyGroups(userId: string): Promise<MyGroup[]> {
  // O filtro seleciona o papel do próprio usuário. O acesso é filtrado pela RLS.
  const { data, error } = await getAuthClient()!
    .from("groups")
    .select(
      `${groupFields},membership:group_members!group_members_group_id_fkey!inner(is_admin)`,
    )
    .eq("membership.user_id", userId)
    .order("created_at", { ascending: false })
    .order("id");
  if (error || !data) throw new Error("groups_read_failed");
  return data;
}

export async function readGroupDetails(
  groupId: string,
): Promise<GroupDetails | null> {
  const client = getAuthClient()!;
  const { data: group, error } = await client
    .from("groups")
    .select(groupFields)
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw new Error("group_read_failed");
  if (!group) return null;

  const { data: members, error: membersError } = await client.rpc(
    "list_group_members",
    {
      target_group_id: groupId,
    },
  );
  if (membersError || !members) throw new Error("group_members_read_failed");
  // Todo grupo tem um Dono membro. Uma lista vazia indica perda de acesso.
  return members.length ? { group, members } : null;
}

export async function createGroup(
  name: string,
  description: string,
): Promise<string> {
  const { data, error } = await getAuthClient()!.rpc("create_group", {
    group_name: name.trim(),
    group_description: description.trim(),
  });
  if (error || !data) throw new Error("group_create_failed");
  return data;
}
