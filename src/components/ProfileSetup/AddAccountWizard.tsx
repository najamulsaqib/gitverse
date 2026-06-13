import { useState } from "react";
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
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";
import type { Account } from "@/types";

const COLORS = ["#7b72e8", "#1dccb2", "#e0a94e", "#e8506e", "#9b88ff", "#46b0e6"];

function fakeKey(email: string) {
  const b =
    "AAAAC3NzaC1lZDI1NTE5AAAAI" +
    btoa(email + Date.now())
      .replace(/[^A-Za-z0-9]/g, "")
      .padEnd(38, "xK7pQ2mN9vR4tL8wZ3")
      .slice(0, 38);
  return `ssh-ed25519 ${b} ${email}`;
}

const STEPS = ["Identity", "Generate key", "Add public key", "Save & finish"];

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

export function AddAccountWizard() {
  const closeAddAccount = useUiStore((s) => s.closeAddAccount);
  const showToast = useUiStore((s) => s.showToast);
  const addAccount = useProfilesStore((s) => s.addAccount);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [host, setHost] = useState("github.com");
  const [color, setColor] = useState(COLORS[3]);
  const [keygen, setKeygen] = useState<KeygenState>("idle");
  const [pubkey, setPubkey] = useState("");
  const [os, setOs] = useState<OsKey>(detectOS());

  const keyName = "id_ed25519_" + (label.toLowerCase().replace(/[^a-z0-9]+/g, "") || "new");
  const initials = (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("") ||
    label.slice(0, 2) ||
    "NA"
  ).toUpperCase();

  const runKeygen = () => {
    setKeygen("running");
    setTimeout(() => {
      setPubkey(fakeKey(email || "you@example.com"));
      setKeygen("done");
    }, 1600);
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canNext = step === 0 ? !!(name && label && email) : step === 1 ? keygen === "done" : true;

  const finish = () => {
    const account: Account = {
      id: "acc" + Date.now(),
      label,
      kind: label,
      name,
      handle: email.split("@")[0],
      email,
      color,
      initials,
      host,
      key: keyName,
      fp: "SHA256:" + btoa(email).slice(0, 4) + "…" + btoa(email).slice(-3),
    };
    addAccount(account);
    closeAddAccount();
    showToast({
      title: `${account.label} added`,
      sub: `SSH key ${account.key} generated · now active`,
      color: account.color,
    });
  };

  const osInfo = OS_INFO[os];

  return (
    <div
      className="absolute inset-0 z-80 bg-[rgba(6,5,12,0.62)] backdrop-blur-[3px] grid place-items-center animate-fade-in"
      onMouseDown={closeAddAccount}
    >
      <div
        className="flex w-190 max-w-[calc(100%-40px)] h-140 max-h-[calc(100%-40px)] bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_50px_120px_-30px_rgba(0,0,0,0.85)] animate-pop"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <StepRail step={step} />
        <div className="flex-1 flex flex-col relative min-w-0">
          <button
            className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg grid place-items-center text-text-3 z-2 hover:bg-surface-2 hover:text-text"
            onClick={closeAddAccount}
          >
            <IcX s={15} />
          </button>

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
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-text-2">Display name</span>
                  <input
                    className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Chen"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-text-2">Label</span>
                  <input
                    className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Client · Orbit"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-text-2">Commit email</span>
                <input
                  className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@orbit.dev"
                  type="email"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-text-2">Host</span>
                  <select
                    className="bg-bg border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  >
                    <option>github.com</option>
                    <option>gitlab.com</option>
                    <option>bitbucket.org</option>
                    <option>custom (self-hosted)</option>
                  </select>
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-text-2">Accent</span>
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
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 overflow-auto pt-6.5 px-7 pb-3 flex flex-col gap-3.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Generate an SSH key</h2>
              <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
                A dedicated key per identity means you never cross-authenticate. GitVerse runs{" "}
                <code className="font-mono text-[12px] bg-surface-2 px-1.25 py-px rounded text-indigo-light">
                  ssh-keygen
                </code>{" "}
                locally.
              </p>
              <div className="bg-[#0c0b16] border border-border rounded-[10px] overflow-hidden font-mono">
                <div className="flex items-center gap-1.75 px-3 py-2 text-[11.5px] text-text-3 bg-[#13111f] border-b border-border-soft">
                  <IcTerminal s={13} /> ssh-keygen
                </div>
                <div className="px-3.5 py-3 text-[12px] leading-[1.75] text-text-2 max-h-42.5 overflow-auto">
                  <div className="whitespace-pre-wrap break-all">
                    <span className="text-indigo mr-1.75">$</span> ssh-keygen -t ed25519 -C "{email || "you@example.com"}"
                    -f ~/.ssh/{keyName}
                  </div>
                  {keygen !== "idle" && (
                    <div className="whitespace-pre-wrap break-all text-text-3">
                      Generating public/private ed25519 key pair…
                    </div>
                  )}
                  {keygen === "done" && (
                    <>
                      <div className="whitespace-pre-wrap break-all text-teal">
                        Your identification has been saved in ~/.ssh/{keyName}
                      </div>
                      <div className="whitespace-pre-wrap break-all text-text-3">The key fingerprint is:</div>
                      <div className="whitespace-pre-wrap break-all">
                        SHA256:{btoa(email || "x").slice(0, 6)}…{btoa(email || "x").slice(-4)} {email}
                      </div>
                    </>
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
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 overflow-auto pt-6.5 px-7 pb-3 flex flex-col gap-3.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Add the public key to {host}</h2>
              <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
                Copy the public half and paste it into <strong className="text-text">{host} → Settings → SSH keys</strong>.
                The private key never leaves this machine.
              </p>
              <CopyField value={pubkey} />
              <a
                className="inline-flex items-center gap-2 text-[13px] font-medium text-indigo-light no-underline w-fit hover:underline"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                <IcGlobe s={14} /> Open {host} SSH key settings
              </a>
              <div className="flex items-start gap-2.25 text-[12.5px] text-text-2 leading-normal bg-bg border border-border-soft rounded-[10px] py-2.75 px-3.25">
                <span className="flex-none mt-px text-teal">
                  <IcLock s={14} />
                </span>
                GitVerse stores{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">{keyName}</code> with{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">600</code> permissions and adds a matching{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">~/.ssh/config</code> Host block.
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
                  {keyName}
                </code>
              </div>
              <div className="bg-[#0c0b16] border border-border rounded-[10px] overflow-hidden font-mono">
                <div className="flex items-center gap-1.75 px-3 py-2 text-[11.5px] text-text-3 bg-[#13111f] border-b border-border-soft">
                  <IcTerminal s={13} /> register with ssh-agent
                </div>
                <div className="px-3.5 py-3 text-[12px] leading-[1.75] text-text-2 max-h-42.5 overflow-auto">
                  {osInfo.lines.map((l, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all">
                      <span className="text-indigo mr-1.75">{os === "windows" ? ">" : "$"}</span> {l.replace("{KEY}", keyName)}
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
                    className="grid place-items-center text-[#0b0a16] font-bold rounded-lg flex-none"
                    style={{ background: `linear-gradient(150deg, ${color}, ${color}bb)`, width: 30, height: 30, fontSize: 11 }}
                  >
                    {initials}
                  </span>
                  <span>
                    {name} · <span style={{ color }}>{label || "identity"}</span>
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2.25 flex-none">
              {step > 0 && (
                <button
                  className="px-4 py-2.25 rounded-lg text-[13px] font-semibold text-text-2 hover:bg-surface-2 hover:text-text"
                  onClick={back}
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold bg-linear-to-b from-indigo to-[#6a61dd] text-white transition-all shadow-[0_6px_18px_-8px_rgba(123,114,232,0.8)] enabled:hover:brightness-110 disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none disabled:cursor-not-allowed"
                  disabled={!canNext}
                  onClick={next}
                >
                  Continue
                </button>
              ) : (
                <button
                  className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold bg-linear-to-b from-indigo to-[#6a61dd] text-white transition-all shadow-[0_6px_18px_-8px_rgba(123,114,232,0.8)] enabled:hover:brightness-110"
                  onClick={finish}
                >
                  <IcPlus s={14} sw={2} /> Add account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
