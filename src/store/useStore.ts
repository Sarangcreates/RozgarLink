import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeed } from "../data/seed";
import type { Action, DataSet, Session } from "../engine/types";
import { applyAction } from "../lib/actions";
import { evaluateApplicant, resultDiff } from "../engine/matching";
import { ApiError, request } from "../lib/api";
interface Store {
  data: DataSet;
  session: Session | null;
  mode: "sqlite" | "local";
  ready: boolean;
  busy: boolean;
  theme: "light" | "dark";
  message: string;
  changes: string[];
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  login: (
    role: Session["role"],
    identifier: string,
    password: string,
  ) => Promise<void>;
  register: (
    role: Session["role"],
    name: string,
    email: string,
    password: string,
    discoverable: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetDemo: () => Promise<void>;
  act: (action: Action) => Promise<void>;
  notify: (message: string) => void;
  setTheme: () => void;
  clearChanges: () => void;
}
function diff(old: DataSet, next: DataSet, s: Session | null) {
  if (!s || s.role !== "applicant") return [];
  const a = old.applicants.find((a) => a.id === s.id),
    b = next.applicants.find((a) => a.id === s.id);
  if (!a || !b) return [];
  return resultDiff(
    evaluateApplicant(a, old.opportunities),
    evaluateApplicant(b, next.opportunities),
  ).map((line) => {
    for (const j of next.opportunities)
      if (line.startsWith(j.id + ":")) return j.title + line.slice(j.id.length);
    return line;
  });
}
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      data: createSeed(),
      session: null,
      mode: "sqlite",
      ready: false,
      busy: false,
      theme: "light",
      message: "",
      changes: [],
      connect: async () => {
        try {
          const [state, auth] = await Promise.all([
            request("/state"),
            request("/auth/me"),
          ]);
          set({
            data: state.data,
            session: auth.session,
            mode: "sqlite",
            ready: true,
            message: "",
          });
        } catch {
          set({
            mode: "sqlite",
            session: null,
            ready: true,
            message: "Server unavailable. Start npm run dev and retry.",
          });
        }
      },
      refresh: async () => {
        if (get().mode !== "sqlite" || get().busy) return;
        try {
          const { data } = await request("/state");
          if (data.revision !== get().data.revision) {
            set({ changes: diff(get().data, data, get().session), data });
          }
        } catch {
          set({
            message:
              "Local server connection interrupted. Your existing data remains visible.",
          });
        }
      },
      login: async (role, identifier, password) => {
        const { session } = await request("/auth/login", {
          role,
          identifier,
          password,
        });
        const { data } = await request("/state");
        set({
          session,
          data,
          mode: "sqlite",
          changes: [],
          message: "Signed in.",
        });
      },
      register: async (role, name, email, password, discoverable) => {
        const { session } = await request("/auth/register", {
          role,
          name,
          email,
          password,
          discoverable,
        });
        const { data } = await request("/state");
        set({
          session,
          data,
          mode: "sqlite",
          changes: [],
          message: "Account created. Complete your profile to get started.",
        });
      },
      logout: async () => {
        await request("/auth/logout", {});
        const { data } = await request("/state");
        set({ session: null, data, changes: [], message: "" });
      },
      resetDemo: async () => {
        throw new Error("Dataset reset is disabled in the prototype.");
      },
      act: async (action) => {
        const { session, data, mode } = get();
        if (!session) throw new Error("Sign in first.");
        if (get().busy)
          throw new Error(
            "A save is already in progress. Try again in a moment.",
          );
        set({ busy: true });
        try {
          const optimistic = await applyAction(data, session, action);
          set({ data: optimistic, changes: diff(data, optimistic, session) });
          const updated =
            mode === "sqlite"
              ? (await request("/actions", { revision: data.revision, action }))
                  .data
              : optimistic;
          const changes = diff(data, updated, session);
          set({
            data: updated,
            changes,
            message: changes.length
              ? `${changes.length} matching result${changes.length === 1 ? "" : "s"} changed.`
              : "Saved. Matching results recomputed.",
          });
        } catch (e) {
          set({
            data: e instanceof ApiError && e.data ? (e.data as DataSet) : data,
            message: e instanceof Error ? e.message : "Save failed.",
          });
          throw e;
        } finally {
          set({ busy: false });
        }
      },
      notify: (message) => set({ message }),
      setTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
      clearChanges: () => set({ changes: [] }),
    }),
    {
      name: "rozgarlink-prototype-v2",
      partialize: (s) => ({ theme: s.theme }),
      version: 1,
    },
  ),
);
