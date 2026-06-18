import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/shared/Button";
import { Field } from "@/components/shared/Field";
import { IconButton } from "@/components/shared/IconButton";
import { Input } from "@/components/shared/Input";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import {
  IcCheck,
  IcCopy,
  IcGlobe,
  IcKey,
  IcLock,
  IcPlus,
  IcSync,
  IcTerminal,
  IcX,
} from "@/components/shared/icons";
import {
  DEFAULT_IDENTITY_ICON,
  IdentityIcon,
  IdentityIconPicker,
} from "@/components/shared/identityIcons";
import { generateSshKey, listSshKeys } from "@/hooks/useProfile";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";
import type { Account, SshKeyInfo } from "@/types";

const COLORS = ["#7b72e8", "#1dccb2", "#e0a94e", "#e8506e", "#9b88ff", "#46b0e6"];

const STEPS = ["Identity", "Generate key", "Add public key", "Save & finish"];

const SSH_KEY_SETTINGS_URLS: Record<string, string> = {
  "github.com": "https://github.com/settings/keys",
  "gitlab.com": "https://gitlab.com/-/user_settings/ssh_keys",
  "bitbucket.org": "https://bitbucket.org/account/settings/ssh-keys/",
};

function StepRail({ step }: { step: number }) {
  return (
    <div className="w-53 flex-none bg-[#0d0c1a] border-r border-border-soft py-5.5 px-4.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-text mb-4">
        <IcKey s={16} /> New account
      </div>
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`flex items-center gap-2.75 px-2.5 py-2.25 rounded-[9px] text-[13px] transition-colors duration-150 ${i === step ? "text-text bg-indigo/12" : i < step ? "text-text-2" : "text-text-3"
            }`}
        >
          <span
            className={`w-5.5 h-5.5 rounded-[7px] grid place-items-center text-[11.5px] font-semibold flex-none border ${i === step
              ? "bg-indigo text-white border-indigo"
              : i < step
                ? "bg-teal/16 text-teal border-teal/40"
                : "bg-surface-2 text-text-3 border-border"
              }`}
          >
            {i < step ? <IcCheck s={12} sw={2.4} /> : i + 1}
          </span>
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex items-start gap-2.5 bg-[#0c0b16] border border-border rounded-[10px] py-3 px-3 pl-3.5">
      <code className="flex-1 font-mono text-[11.5px] leading-[1.6] text-teal-light break-all">{value}</code>
      <button
        className={`flex-none flex items-center gap-1.5 text-[12px] font-semibold py-1.75 px-3 rounded-[7px] bg-surface-2 border border-border transition-colors hover:border-indigo hover:text-text ${copied ? "text-teal border-teal/40" : "text-text-2"
          }`}
        onClick={copy}
      >
        {copied ? (
          <>
            <IcCheck s={13} sw={2.2} /> Copied
          </>
        ) : (
          <>
            <IcCopy s={13} /> Copy
          </>
        )}
      </button>
    </div>
  );
}

type OsKey = "mac" | "windows" | "linux";

const OS_INFO: Record<OsKey, { label: string; path: string; lines: string[]; note: string }> = {
  mac: {
    label: "macOS",
    path: "~/.ssh/",
    lines: ['eval "$(ssh-agent -s)"', "ssh-add --apple-use-keychain ~/.ssh/{KEY}"],
    note: "Add to ~/.ssh/config so the key is keychain-managed across reboots.",
  },
  windows: {
    label: "Windows",
    path: "C:\\Users\\you\\.ssh\\",
    lines: [
      "Get-Service ssh-agent | Set-Service -StartupType Automatic",
      "Start-Service ssh-agent",
      "ssh-add $env:USERPROFILE\\.ssh\\{KEY}",
    ],
    note: "Run in an elevated PowerShell. The key lives in %USERPROFILE%\\.ssh.",
  },
  linux: {
    label: "Linux",
    path: "~/.ssh/",
    lines: ['eval "$(ssh-agent -s)"', "ssh-add ~/.ssh/{KEY}"],
    note: "Most distros keep keys in ~/.ssh with 600 permissions.",
  },
};

function detectOS(): OsKey {
  const p = (navigator.platform || navigator.userAgent || "").toLowerCase();
  if (p.includes("win")) return "windows";
  if (p.includes("linux") && !p.includes("android")) return "linux";
  return "mac";
}

type KeygenState = "idle" | "running" | "done";

export function AddAccountWizard({ dismissible = true }: { dismissible?: boolean }) {
  const closeAddAccount = useUiStore((s) => s.closeAddAccount);
  const showToast = useUiStore((s) => s.showToast);
  const addAccount = useProfilesStore((s) => s.addAccount);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [host, setHost] = useState("github.com");
  const [color, setColor] = useState(COLORS[3]);
  const [icon, setIcon] = useState(DEFAULT_IDENTITY_ICON);
  const [keygen, setKeygen] = useState<KeygenState>("idle");
  const [keyMode, setKeyMode] = useState<"generate" | "existing">("generate");
  const [sshKeyInfo, setSshKeyInfo] = useState<SshKeyInfo | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [existingKeys, setExistingKeys] = useState<SshKeyInfo[] | null>(null);
  const [existingKeysLoading, setExistingKeysLoading] = useState(false);
  const [os, setOs] = useState<OsKey>(detectOS());
  const [urlCopied, setUrlCopied] = useState(false);

  const keyName = "id_ed25519_" + (label.toLowerCase().replace(/[^a-z0-9]+/g, "") || "new");

  const runKeygen = async () => {
    setKeygen("running");
    setKeyError(null);
    try {
      const info = await generateSshKey(keyName, email || "you@example.com");
      setSshKeyInfo(info);
      setKeygen("done");
    } catch (e) {
      setKeyError(String(e));
      setKeygen("idle");
    }
  };

  const switchToExisting = async () => {
    setKeyMode("existing");
    setKeyError(null);
    if (existingKeys) return;
    setExistingKeysLoading(true);
    try {
      const keys = await listSshKeys();
      setExistingKeys(keys);
    } catch (e) {
      setKeyError(String(e));
    } finally {
      setExistingKeysLoading(false);
    }
  };

  const selectExistingKey = (info: SshKeyInfo) => {
    setSshKeyInfo(info);
    setKeygen("done");
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canNext = step === 0 ? !!(name && label && email) : step === 1 ? !!sshKeyInfo : true;

  const finish = async () => {
    if (!sshKeyInfo) return;
    const account: Account = {
      id: "acc" + Date.now(),
      label,
      kind: label,
      name,
      handle: email.split("@")[0],
      email,
      color,
      icon,
      host,
      key: sshKeyInfo.name,
      fp: sshKeyInfo.fingerprint,
    };
    try {
      await addAccount(account);
      closeAddAccount();
      showToast({
        title: `${account.label} added`,
        sub: `SSH key ${account.key} ready · now active`,
        color: account.color,
      });
    } catch (e) {
      showToast({
        title: "Failed to add account",
        sub: String(e),
        color: "#e8506e",
      });
    }
  };

  const osInfo = OS_INFO[os];

  return (
    <Modal
      onClose={dismissible ? closeAddAccount : undefined}
      className="flex w-190 max-w-[calc(100%-40px)] h-140 max-h-[calc(100%-40px)]"
    >
      <StepRail step={step} />
      <div className="flex-1 flex flex-col relative min-w-0">
        {dismissible && (
          <IconButton
            className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
            onClick={closeAddAccount}
          >
            <IcX s={15} />
          </IconButton>
        )}

        {step === 0 && (
          <div className="flex-1 overflow-auto pt-6.5 px-7 pb-3 flex flex-col gap-3.5">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Add a Git identity</h2>
            <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
              GitVerse keeps each identity isolated. Switching writes the right{" "}
              <code className="font-mono text-[12px] bg-surface-2 px-1.25 py-px rounded text-indigo-light">
                user.name
              </code>{" "}
              /{" "}
              <code className="font-mono text-[12px] bg-surface-2 px-1.25 py-px rounded text-indigo-light">
                user.email
              </code>{" "}
              into{" "}
              <code className="font-mono text-[12px] bg-surface-2 px-1.25 py-px rounded text-indigo-light">
                .git/config
              </code>{" "}
              automatically — no manual edits.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Display name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Chen" />
              </Field>
              <Field label="Label">
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Client · Orbit" />
              </Field>
            </div>
            <Field label="Commit email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@orbit.dev"
                type="email"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Host">
                <Select value={host} onChange={(e) => setHost(e.target.value)}>
                  <option>github.com</option>
                  <option>gitlab.com</option>
                  <option>bitbucket.org</option>
                  <option>custom (self-hosted)</option>
                </Select>
              </Field>
              <Field label="Accent">
                <div className="flex items-center gap-1.75 h-9.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-5.5 h-5.5 rounded-[7px] border-2 transition-all ${c === color ? "border-text scale-[1.12]" : "border-transparent"
                        }`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Avatar icon">
              <IdentityIconPicker value={icon} color={color} onChange={setIcon} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 overflow-auto pt-6.5 px-7 pb-3 flex flex-col gap-3.5">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
              {keyMode === "generate" ? "Generate an SSH key" : "Use an existing SSH key"}
            </h2>
            <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
              A dedicated key per identity means you never cross-authenticate. GitVerse runs{" "}
              <code className="font-mono text-[12px] bg-surface-2 px-1.25 py-px rounded text-indigo-light">
                ssh-keygen
              </code>{" "}
              locally.
            </p>
            <div className="flex gap-1.5">
              <button
                className={`flex-1 p-2.25 rounded-lg text-[12.5px] font-semibold transition-colors ${keyMode === "generate" ? "bg-indigo/12 border border-indigo text-text" : "bg-bg border border-border text-text-3"
                  }`}
                onClick={() => {
                  setKeyMode("generate");
                  setSshKeyInfo(null);
                  setKeygen("idle");
                  setKeyError(null);
                }}
              >
                Generate new
              </button>
              <button
                className={`flex-1 p-2.25 rounded-lg text-[12.5px] font-semibold transition-colors ${keyMode === "existing" ? "bg-indigo/12 border border-indigo text-text" : "bg-bg border border-border text-text-3"
                  }`}
                onClick={switchToExisting}
              >
                Use existing
              </button>
            </div>

            {keyMode === "generate" && (
              <>
                <div className="bg-[#0c0b16] border border-border rounded-[10px] overflow-hidden font-mono">
                  <div className="flex items-center gap-1.75 px-3 py-2 text-[11.5px] text-text-3 bg-[#13111f] border-b border-border-soft">
                    <IcTerminal s={13} /> ssh-keygen
                  </div>
                  <div className="px-3.5 py-3 text-[12px] leading-[1.75] text-text-2 max-h-42.5 overflow-auto">
                    <div className="whitespace-pre-wrap break-all">
                      <span className="text-indigo mr-1.75">$</span> ssh-keygen -t ed25519 -C "{email || "you@example.com"}"
                      -f ~/.ssh/{keyName}
                    </div>
                    {keygen === "running" && (
                      <div className="whitespace-pre-wrap break-all text-text-3">
                        Generating public/private ed25519 key pair…
                      </div>
                    )}
                    {keygen === "done" && sshKeyInfo && (
                      <>
                        <div className="whitespace-pre-wrap break-all text-teal">
                          Your identification has been saved in ~/.ssh/{sshKeyInfo.name}
                        </div>
                        <div className="whitespace-pre-wrap break-all text-text-3">The key fingerprint is:</div>
                        <div className="whitespace-pre-wrap break-all">
                          {sshKeyInfo.fingerprint} {sshKeyInfo.comment}
                        </div>
                      </>
                    )}
                    {keyError && (
                      <div className="whitespace-pre-wrap break-all text-red">{keyError}</div>
                    )}
                  </div>
                </div>
                <button
                  className={`flex items-center justify-center gap-2.25 p-3 rounded-[10px] text-[13.5px] font-semibold transition-all ${keygen === "done"
                    ? "bg-teal/[0.14] text-teal border border-teal/40 shadow-none"
                    : "bg-linear-to-b from-indigo to-[#6a61dd] text-white shadow-[0_8px_22px_-10px_rgba(123,114,232,0.8)] enabled:hover:brightness-110 disabled:cursor-default"
                    }`}
                  disabled={keygen !== "idle"}
                  onClick={runKeygen}
                >
                  {keygen === "idle" && (
                    <>
                      <IcKey s={15} /> Generate {keyName}
                    </>
                  )}
                  {keygen === "running" && (
                    <>
                      <span className="inline-flex animate-spin-fast">
                        <IcSync s={15} />
                      </span>
                      Generating…
                    </>
                  )}
                  {keygen === "done" && (
                    <>
                      <IcCheck s={15} sw={2.2} /> Key pair created
                    </>
                  )}
                </button>
              </>
            )}

            {keyMode === "existing" && (
              <>
                {existingKeysLoading && (
                  <div className="flex items-center gap-2 text-[13px] text-text-2 py-2">
                    <span className="inline-flex animate-spin-fast">
                      <IcSync s={14} />
                    </span>
                    Scanning ~/.ssh for keypairs…
                  </div>
                )}
                {keyError && <div className="text-[12.5px] text-red">{keyError}</div>}
                {!existingKeysLoading && existingKeys && existingKeys.length === 0 && (
                  <div className="text-[13px] text-text-2 py-2">No existing keypairs found in ~/.ssh.</div>
                )}
                {existingKeys && existingKeys.length > 0 && (
                  <div className="flex flex-col gap-1.75">
                    {existingKeys.map((k) => {
                      const selected = sshKeyInfo?.name === k.name;
                      return (
                        <button
                          key={k.name}
                          className={`flex items-center gap-2.5 text-left p-2.75 rounded-[10px] border transition-colors ${selected ? "bg-indigo/12 border-indigo text-text" : "bg-bg border-border text-text-2 hover:border-indigo/60"
                            }`}
                          onClick={() => selectExistingKey(k)}
                        >
                          <span className="flex-none text-teal">
                            <IcKey s={15} />
                          </span>
                          <span className="flex flex-col min-w-0 flex-1">
                            <span className="text-[13px] font-semibold text-text truncate">{k.name}</span>
                            <span className="text-[11.5px] text-text-3 truncate">
                              {k.keyType} · {k.comment || "no comment"} · {k.fingerprint}
                            </span>
                          </span>
                          {selected && (
                            <span className="flex-none text-teal">
                              <IcCheck s={15} sw={2.2} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 overflow-auto pt-6.5 px-7 pb-3 flex flex-col gap-3.5">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Add the public key to {host}</h2>
            <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
              Copy the public half and paste it into <strong className="text-text">{host} → Settings → SSH keys</strong>.
              The private key never leaves this machine.
            </p>
            <CopyField value={sshKeyInfo?.publicKey ?? ""} />
            {SSH_KEY_SETTINGS_URLS[host] && (
              <div className="flex items-center gap-1.5">
                <a
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-indigo-light no-underline w-fit hover:underline"
                  href={SSH_KEY_SETTINGS_URLS[host]}
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl(SSH_KEY_SETTINGS_URLS[host]);
                  }}
                >
                  <IcGlobe s={14} /> Open {host} SSH key settings
                </a>
                <IconButton
                  className={`text-text-3 hover:text-text ${urlCopied ? "text-teal" : ""}`}
                  title="Copy URL"
                  onClick={() => {
                    navigator.clipboard?.writeText(SSH_KEY_SETTINGS_URLS[host]).catch(() => { });
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 1600);
                  }}
                >
                  {urlCopied ? <IcCheck s={12} sw={2.2} /> : <IcCopy s={12} />}
                </IconButton>
              </div>
            )}
            <div className="flex items-start gap-2.25 text-[12.5px] text-text-2 leading-normal bg-bg border border-border-soft rounded-[10px] py-2.75 px-3.25">
              <span className="flex-none mt-px text-teal">
                <IcLock s={14} />
              </span>
              <span>
                GitVerse stores{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">{sshKeyInfo?.name ?? keyName}</code> with{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">600</code> permissions and adds a matching{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">~/.ssh/config</code> Host block.
              </span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 overflow-auto pt-6.5 px-7 pb-3 flex flex-col gap-3.5">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Where the key is saved</h2>
            <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
              GitVerse is local-first — pick your platform for the exact path and agent commands.
            </p>
            <div className="flex gap-1.5">
              {(Object.entries(OS_INFO) as Array<[OsKey, (typeof OS_INFO)[OsKey]]>).map(([k, v]) => (
                <button
                  key={k}
                  className={`flex-1 p-2.25 rounded-lg text-[12.5px] font-semibold transition-colors ${os === k ? "bg-indigo/12 border border-indigo text-text" : "bg-bg border border-border text-text-3"
                    }`}
                  onClick={() => setOs(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5 text-[12px]">
              <span className="text-text-3">Saved to</span>
              <code className="font-mono text-teal-light bg-bg border border-border-soft px-2.25 py-1 rounded-md">
                {osInfo.path}
                {sshKeyInfo?.name ?? keyName}
              </code>
            </div>
            <div className="bg-[#0c0b16] border border-border rounded-[10px] overflow-hidden font-mono">
              <div className="flex items-center gap-1.75 px-3 py-2 text-[11.5px] text-text-3 bg-[#13111f] border-b border-border-soft">
                <IcTerminal s={13} /> register with ssh-agent
              </div>
              <div className="px-3.5 py-3 text-[12px] leading-[1.75] text-text-2 max-h-42.5 overflow-auto">
                {osInfo.lines.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    <span className="text-indigo mr-1.75">{os === "windows" ? ">" : "$"}</span> {l.replace("{KEY}", sshKeyInfo?.name ?? keyName)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2.25 text-[12.5px] text-text-2 leading-normal bg-bg border border-border-soft rounded-[10px] py-2.75 px-3.25">
              <span className="flex-none mt-px text-teal">
                <IcCheck s={14} sw={2.2} />
              </span>
              {osInfo.note}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3.5 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
          <div className="flex-1 flex items-center gap-2.25 text-[12.5px] text-text-2 min-w-0">
            {name && (
              <>
                <span
                  className="grid place-items-center text-[#0b0a16] rounded-lg flex-none"
                  style={{ background: `linear-gradient(150deg, ${color}, ${color}bb)`, width: 30, height: 30 }}
                >
                  <IdentityIcon icon={icon} s={17} />
                </span>
                <span>
                  {name} · <span style={{ color }}>{label || "identity"}</span>
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2.25 flex-none">
            {step > 0 && (
              <Button variant="ghost" onClick={back}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px]"
                disabled={!canNext}
                onClick={next}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px]"
                onClick={finish}
              >
                <IcPlus s={14} sw={2} /> Add account
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
