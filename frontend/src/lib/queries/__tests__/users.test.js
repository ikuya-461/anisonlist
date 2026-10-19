import { deleteMyAccount } from "../users";
import { supabase } from "../../supabaseClient";

jest.mock("../../supabaseClient", () => ({
  supabase: {
    auth: { getUser: jest.fn(), signOut: jest.fn() },
    rpc: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

const USER_ID = "11111111-1111-1111-1111-111111111111";
let bucket;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  bucket = {
    list: jest.fn().mockResolvedValue({ data: [{ name: "icon.jpg" }], error: null }),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  supabase.storage.from.mockReturnValue(bucket);
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  supabase.rpc.mockResolvedValue({ error: null });
  supabase.auth.signOut.mockResolvedValue({});
});

describe("deleteMyAccount", () => {
  test("アイコン画像を消してからアカウントを削除する", async () => {
    await expect(deleteMyAccount()).resolves.toBe(true);

    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(bucket.list).toHaveBeenCalledWith(USER_ID);
    expect(bucket.remove).toHaveBeenCalledWith([`${USER_ID}/icon.jpg`]);
    expect(supabase.rpc).toHaveBeenCalledWith("delete_my_account");
    expect(bucket.remove.mock.invocationCallOrder[0])
      .toBeLessThan(supabase.rpc.mock.invocationCallOrder[0]);
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test("画像が無ければ削除呼び出しをせずにアカウントを削除する", async () => {
    bucket.list.mockResolvedValue({ data: [], error: null });

    await expect(deleteMyAccount()).resolves.toBe(true);
    expect(bucket.remove).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("delete_my_account");
  });

  test("画像を消せなければアカウントは削除しない", async () => {
    bucket.remove.mockResolvedValue({ data: null, error: { message: "fail" } });

    await expect(deleteMyAccount()).resolves.toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  test("画像の一覧を取れなければアカウントは削除しない", async () => {
    bucket.list.mockResolvedValue({ data: null, error: { message: "fail" } });

    await expect(deleteMyAccount()).resolves.toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test("ログインしていなければ何もしない", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(deleteMyAccount()).resolves.toBe(false);
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
