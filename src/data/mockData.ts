// Mock data seeding the GitVerse UI until the Tauri backend (ssh-keygen,
// git shell-outs, ~/.gitverse/*.json) lands. Ported from the Claude Design
// prototype's data.jsx.

import type {
  Account,
  Branch,
  Commit,
  CommitFileChange,
  DiffLine,
  FileChange,
  Repo,
  SyncState,
} from "@/types";

export type RepoId = "mobile-app" | "dashboard" | "portfolio" | "gitverse";

export const ACCOUNTS_INIT: Account[] = [
  { id: "acme", label: "Acme Corp", kind: "Work", name: "Sarah Chen", handle: "sarah-acme", email: "s.chen@acme.io", color: "#1dccb2", initials: "AC", host: "github.com", key: "id_ed25519_acme", fp: "SHA256:7Jq2…aF9" },
  { id: "personal", label: "Personal", kind: "Personal", name: "Sarah Chen", handle: "devsarah", email: "sarah@hey.com", color: "#7b72e8", initials: "SC", host: "github.com", key: "id_ed25519", fp: "SHA256:Kp0x…bC2" },
  { id: "freelance", label: "SC Studio", kind: "Freelance", name: "Sarah Chen", handle: "sc-studio", email: "hello@scstudio.dev", color: "#e0a94e", initials: "SF", host: "gitlab.com", key: "id_ed25519_studio", fp: "SHA256:9wZr…dE7" },
];

// repos belong to an account (owner) but you can commit under any active identity
export const REPOS: Repo[] = [
  { id: "mobile-app", name: "mobile-app", owner: "acme", branch: "dev", path: "~/work/acme/mobile-app", private: true, remote: "git@github.com:acme/mobile-app.git" },
  { id: "dashboard", name: "client-dashboard", owner: "freelance", branch: "feature/auth", path: "~/clients/orbit/dashboard", private: true, remote: "git@gitlab.com:sc-studio/orbit-dashboard.git" },
  { id: "portfolio", name: "portfolio-site", owner: "personal", branch: "main", path: "~/code/portfolio-site", private: false, remote: "git@github.com:devsarah/portfolio-site.git" },
  { id: "gitverse", name: "gitverse", owner: "personal", branch: "main", path: "~/oss/gitverse", private: false, remote: "git@github.com:devsarah/gitverse.git" },
];

export const BRANCHES: Record<RepoId, Branch[]> = {
  "mobile-app": [
    { name: "dev", current: true },
    { name: "main", current: false },
    { name: "feature/push-notifications", current: false },
    { name: "fix/login-crash", current: false },
    { name: "release/2.4", current: false },
  ],
  dashboard: [
    { name: "feature/auth", current: true },
    { name: "main", current: false },
    { name: "staging", current: false },
  ],
  portfolio: [
    { name: "main", current: true },
    { name: "redesign-2026", current: false },
  ],
  gitverse: [
    { name: "main", current: true },
    { name: "feat/multi-account", current: false },
  ],
};

// per-repo sync posture: ahead/behind drives the Fetch/Push/Pull button
export const SYNC: Record<RepoId, SyncState> = {
  "mobile-app": { ahead: 2, behind: 0, lastFetch: "just now" },
  dashboard: { ahead: 5, behind: 0, lastFetch: "3 minutes ago" },
  portfolio: { ahead: 0, behind: 1, lastFetch: "12 minutes ago" },
  gitverse: { ahead: 0, behind: 0, lastFetch: "1 hour ago" },
};

// ---- working tree (changed files) per repo ----
export const FILES: Record<RepoId, FileChange[]> = {
  "mobile-app": [
    { path: "src/screens/LoginScreen.tsx", status: "M", staged: true, add: 14, del: 6 },
    { path: "src/api/auth.ts", status: "M", staged: true, add: 8, del: 2 },
    { path: "src/components/AuthButton.tsx", status: "A", staged: true, add: 28, del: 0 },
    { path: "src/hooks/useSession.ts", status: "M", staged: false, add: 4, del: 4 },
    { path: "README.md", status: "M", staged: false, add: 3, del: 1 },
  ],
  dashboard: [
    { path: "app/(auth)/login/page.tsx", status: "M", staged: true, add: 19, del: 11 },
    { path: "lib/session.ts", status: "A", staged: true, add: 41, del: 0 },
  ],
  portfolio: [],
  gitverse: [],
};

// ---- diffs keyed by file path ----
export const DIFFS: Record<string, DiffLine[]> = {
  "src/screens/LoginScreen.tsx": [
    { t: "hunk", a: "@@ -18,9 +18,17 @@ export function LoginScreen() {" },
    { t: "ctx", n: "  const { signIn, status } = useSession();" },
    { t: "ctx", n: '  const [email, setEmail] = useState("");' },
    { t: "del", n: '  const [password, setPassword] = useState("");' },
    { t: "add", n: '  const [password, setPassword] = useState("");' },
    { t: "add", n: "  const [useBiometric, setUseBiometric] = useState(true);" },
    { t: "ctx", n: "" },
    { t: "del", n: "  const onSubmit = async () => {" },
    { t: "del", n: "    await signIn(email, password);" },
    { t: "add", n: "  const onSubmit = async () => {" },
    { t: "add", n: "    if (useBiometric && (await Biometrics.isAvailable())) {" },
    { t: "add", n: "      return signIn.withBiometric();" },
    { t: "add", n: "    }" },
    { t: "add", n: "    await signIn(email, password);" },
    { t: "ctx", n: "  };" },
    { t: "ctx", n: "" },
    { t: "ctx", n: "  return (" },
    { t: "del", n: "    <View style={styles.container}>" },
    { t: "add", n: '    <View style={styles.container} testID="login-screen">' },
    { t: "ctx", n: "      <Logo />" },
    { t: "add", n: "      <AuthButton biometric={useBiometric} onPress={onSubmit} />" },
    { t: "ctx", n: "    </View>" },
    { t: "ctx", n: "  );" },
  ],
  "src/api/auth.ts": [
    { t: "hunk", a: '@@ -4,7 +4,13 @@ import { client } from "./client";' },
    { t: "ctx", n: "export async function signIn(email: string, password: string) {" },
    { t: "del", n: '  const res = await client.post("/auth/login", { email, password });' },
    { t: "add", n: '  const res = await client.post("/auth/login", {' },
    { t: "add", n: "    email," },
    { t: "add", n: "    password," },
    { t: "add", n: "    device: await getDeviceId()," },
    { t: "add", n: "  });" },
    { t: "ctx", n: "  return res.data.token;" },
    { t: "ctx", n: "}" },
    { t: "add", n: "" },
    { t: "add", n: 'signIn.withBiometric = () => client.post("/auth/biometric");' },
  ],
  "src/components/AuthButton.tsx": [
    { t: "hunk", a: "@@ -0,0 +1,28 @@" },
    { t: "add", n: 'import { Pressable, Text } from "react-native";' },
    { t: "add", n: 'import { useState } from "react";' },
    { t: "add", n: "" },
    { t: "add", n: "type Props = {" },
    { t: "add", n: "  biometric?: boolean;" },
    { t: "add", n: "  onPress: () => Promise<void>;" },
    { t: "add", n: "};" },
    { t: "add", n: "" },
    { t: "add", n: "export function AuthButton({ biometric, onPress }: Props) {" },
    { t: "add", n: "  const [busy, setBusy] = useState(false);" },
    { t: "add", n: '  const label = biometric ? "Sign in with Face ID" : "Sign in";' },
    { t: "add", n: "  return (" },
    { t: "add", n: "    <Pressable disabled={busy} onPress={() => { setBusy(true); onPress(); }}>" },
    { t: "add", n: '      <Text>{busy ? "…" : label}</Text>' },
    { t: "add", n: "    </Pressable>" },
    { t: "add", n: "  );" },
    { t: "add", n: "}" },
  ],
  "src/hooks/useSession.ts": [
    { t: "hunk", a: "@@ -11,4 +11,4 @@ export function useSession() {" },
    { t: "del", n: '  const refresh = () => mutate("/auth/me");' },
    { t: "add", n: '  const refresh = () => mutate("/auth/me", undefined, { revalidate: true });' },
    { t: "ctx", n: "  return { user, status, refresh };" },
    { t: "ctx", n: "}" },
  ],
  "README.md": [
    { t: "hunk", a: "@@ -1,5 +1,7 @@" },
    { t: "ctx", n: "# Acme Mobile" },
    { t: "del", n: "React Native app for Acme." },
    { t: "add", n: "React Native app for Acme." },
    { t: "add", n: "" },
    { t: "add", n: "## Auth supports Face ID / Touch ID as of 2.4." },
  ],
  "app/(auth)/login/page.tsx": [
    { t: "hunk", a: "@@ -2,6 +2,12 @@" },
    { t: "del", n: "export default function Login() {" },
    { t: "add", n: "export default async function Login() {" },
    { t: "add", n: "  const session = await getSession();" },
    { t: "add", n: '  if (session) redirect("/dashboard");' },
    { t: "ctx", n: "  return <AuthForm />;" },
    { t: "ctx", n: "}" },
  ],
  "lib/session.ts": [
    { t: "hunk", a: "@@ -0,0 +1,41 @@" },
    { t: "add", n: 'import { cookies } from "next/headers";' },
    { t: "add", n: 'import { verify } from "./jwt";' },
    { t: "add", n: "" },
    { t: "add", n: "export async function getSession() {" },
    { t: "add", n: '  const token = cookies().get("sid")?.value;' },
    { t: "add", n: "  if (!token) return null;" },
    { t: "add", n: "  return verify(token);" },
    { t: "add", n: "}" },
  ],
  "package.json": [
    { t: "hunk", a: '@@ -11,8 +11,8 @@ "name": "acme-mobile",' },
    { t: "ctx", n: '  "dependencies": {' },
    { t: "del", n: '    "react-native": "0.78.2",' },
    { t: "add", n: '    "react-native": "0.79.0",' },
    { t: "ctx", n: '    "expo": "~51.0.0",' },
    { t: "del", n: '    "expo-local-authentication": "^14.0.0"' },
    { t: "add", n: '    "expo-local-authentication": "^15.0.1"' },
    { t: "ctx", n: "  }" },
  ],
};

// ---- which files each commit touched (commit detail view) ----
export const COMMIT_CHANGES: Record<string, CommitFileChange[]> = {
  a3f9c21: [
    { path: "src/screens/LoginScreen.tsx", status: "M", add: 14, del: 6 },
    { path: "src/api/auth.ts", status: "M", add: 8, del: 2 },
    { path: "src/components/AuthButton.tsx", status: "A", add: 28, del: 0 },
    { path: "src/hooks/useSession.ts", status: "M", add: 4, del: 4 },
    { path: "README.md", status: "M", add: 3, del: 1 },
    { path: "package.json", status: "M", add: 2, del: 2 },
  ],
  "7b1e4d0": [
    { path: "src/hooks/useSession.ts", status: "M", add: 18, del: 22 },
    { path: "src/api/auth.ts", status: "M", add: 31, del: 19 },
    { path: "package.json", status: "M", add: 1, del: 1 },
    { path: "README.md", status: "M", add: 2, del: 0 },
  ],
  b8e2f10: [
    { path: "src/components/AuthButton.tsx", status: "A", add: 28, del: 0 },
    { path: "src/screens/LoginScreen.tsx", status: "M", add: 12, del: 3 },
    { path: "src/hooks/useSession.ts", status: "M", add: 12, del: 6 },
  ],
  c2d4a89: [
    { path: "src/components/AuthButton.tsx", status: "A", add: 21, del: 0 },
    { path: "src/screens/LoginScreen.tsx", status: "M", add: 10, del: 2 },
  ],
  c92a18f: [{ path: "src/screens/LoginScreen.tsx", status: "M", add: 12, del: 3 }],
  d41b8e3: [
    { path: "package.json", status: "M", add: 4, del: 4 },
    { path: "README.md", status: "M", add: 4, del: 4 },
  ],
  e07c5a9: [
    { path: "src/api/auth.ts", status: "M", add: 19, del: 1 },
    { path: "src/screens/LoginScreen.tsx", status: "M", add: 8, del: 2 },
    { path: "src/hooks/useSession.ts", status: "M", add: 4, del: 1 },
  ],
  f5a3b22: [
    { path: "src/screens/LoginScreen.tsx", status: "A", add: 120, del: 0 },
    { path: "src/api/auth.ts", status: "A", add: 80, del: 0 },
    { path: "src/components/AuthButton.tsx", status: "A", add: 60, del: 0 },
    { path: "src/hooks/useSession.ts", status: "A", add: 40, del: 0 },
    { path: "README.md", status: "A", add: 60, del: 0 },
    { path: "package.json", status: "A", add: 50, del: 0 },
  ],
  "11ab9f0": [
    { path: "app/(auth)/login/page.tsx", status: "M", add: 19, del: 11 },
    { path: "lib/session.ts", status: "A", add: 41, del: 0 },
  ],
  "22cd8e1": [
    { path: "app/(auth)/login/page.tsx", status: "A", add: 120, del: 0 },
    { path: "lib/session.ts", status: "A", add: 100, del: 0 },
  ],
  "90fe1ab": [{ path: "README.md", status: "M", add: 4, del: 6 }],
  "00aa11b": [{ path: "src/screens/LoginScreen.tsx", status: "M", add: 200, del: 12 }],
};

// ---- history (per repo) — `by` = committing identity; lane/parents/refs drive the commit graph ----
export const LANE_COLORS = ["#7b72e8", "#1dccb2", "#e0a94e", "#c4c0ff"];

export const HISTORY: Record<RepoId, Commit[]> = {
  "mobile-app": [
    { hash: "a3f9c21", subject: "Merge branch 'feature/biometric' into dev", by: "acme", when: "2 hours ago", add: 142, del: 38, files: 6, lane: 0, parents: ["7b1e4d0", "b8e2f10"], refs: [{ name: "dev", head: true }] },
    { hash: "7b1e4d0", subject: "Refactor session token refresh", by: "acme", when: "Yesterday", add: 64, del: 51, files: 4, lane: 0, parents: ["c92a18f"] },
    { hash: "b8e2f10", subject: "Wire AuthButton into login screen", by: "acme", when: "Yesterday", add: 52, del: 9, files: 3, lane: 1, parents: ["c2d4a89"], refs: [{ name: "feature/biometric" }] },
    { hash: "c2d4a89", subject: "Add Face ID prompt + fallback", by: "personal", when: "2 days ago", add: 31, del: 2, files: 2, lane: 1, parents: ["c92a18f"], flag: true },
    { hash: "c92a18f", subject: "Fix crash on empty email field", by: "acme", when: "2 days ago", add: 12, del: 3, files: 1, lane: 0, parents: ["d41b8e3"] },
    { hash: "d41b8e3", subject: "Bump react-native to 0.79", by: "acme", when: "3 days ago", add: 8, del: 8, files: 2, lane: 0, parents: ["e07c5a9"] },
    { hash: "e07c5a9", subject: "Add device fingerprint to login", by: "acme", when: "4 days ago", add: 31, del: 4, files: 3, lane: 0, parents: ["f5a3b22"] },
    { hash: "f5a3b22", subject: "Initial auth screens", by: "acme", when: "last week", add: 410, del: 0, files: 12, lane: 0, parents: [] },
  ],
  dashboard: [
    { hash: "11ab9f0", subject: "Wire up server-side session guard", by: "freelance", when: "3 minutes ago", add: 60, del: 11, files: 3, lane: 0, parents: ["22cd8e1"], refs: [{ name: "feature/auth", head: true }] },
    { hash: "22cd8e1", subject: "Scaffold Orbit dashboard layout", by: "freelance", when: "1 hour ago", add: 220, del: 0, files: 9, lane: 0, parents: [] },
  ],
  portfolio: [
    { hash: "90fe1ab", subject: "Tweak hero spacing", by: "personal", when: "12 minutes ago", add: 4, del: 6, files: 1, lane: 0, parents: [], refs: [{ name: "main", head: true }] },
  ],
  gitverse: [
    { hash: "00aa11b", subject: "Multi-account rail prototype", by: "personal", when: "1 hour ago", add: 380, del: 12, files: 7, lane: 0, parents: [], refs: [{ name: "main", head: true }] },
  ],
};
