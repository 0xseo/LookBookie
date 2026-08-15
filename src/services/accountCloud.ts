import { supabase } from "./supabaseClient";

type DeleteAccountResponse = {
  deleted?: boolean;
  error?: string;
};

export async function deleteCurrentCloudAccount() {
  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았어요.");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error("탈퇴하려면 다시 로그인해 주세요.");
  }

  const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
    "delete-account",
    { method: "POST" }
  );

  if (error) {
    throw new Error("클라우드 계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  if (!data?.deleted) {
    throw new Error(data?.error || "계정 삭제가 완료되지 않았어요.");
  }

  await supabase.auth.signOut({ scope: "local" });
}
