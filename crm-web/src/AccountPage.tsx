import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { trpc, type SessionData } from "./api";

const inputClass =
  "focus-ring mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-base text-ink outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:bg-surface-soft";
const secondaryTextClass = "mt-2 text-sm leading-6 text-muted";
type ProfileField = "name" | "email" | "currentPassword" | "";
type PasswordField = "currentPassword" | "newPassword" | "confirmation" | "";

function errorField(message: string): ProfileField {
  const normalized = message.toLowerCase();
  if (normalized.includes("nome")) return "name";
  if (normalized.includes("senha")) return "currentPassword";
  return "email";
}

export function AccountPage({
  session,
  onSessionUpdated,
}: {
  session: SessionData;
  onSessionUpdated: (session: SessionData) => void;
}) {
  const [name, setName] = useState(session.user.name);
  const [email, setEmail] = useState(session.user.email);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileInvalidField, setProfileInvalidField] = useState<ProfileField>("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordInvalidField, setPasswordInvalidField] = useState<PasswordField>("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const emailChanged = email.trim().toLowerCase() !== session.user.email.toLowerCase();

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    setProfileError("");
    setProfileInvalidField("");
    setProfileSuccess("");

    if (trimmedName.length < 2) {
      setProfileError("Informe seu nome completo.");
      setProfileInvalidField("name");
      return;
    }

    if (emailChanged && !profilePassword) {
      setProfileError("Informe sua senha atual para alterar o e-mail.");
      setProfileInvalidField("currentPassword");
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await trpc.crm.account.updateProfile.mutate({
        name: trimmedName,
        email: normalizedEmail,
        ...(emailChanged ? { currentPassword: profilePassword } : {}),
      });
      onSessionUpdated({
        ...session,
        user: { ...session.user, ...updated.user },
      });
      setName(updated.user.name);
      setEmail(updated.user.email);
      setProfilePassword("");
      setProfileSuccess("Seus dados foram atualizados.");
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar seus dados.";
      setProfileError(message);
      setProfileInvalidField(errorField(message));
    } finally {
      setProfileSaving(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordSaving) return;

    setPasswordError("");
    setPasswordInvalidField("");
    setPasswordSuccess("");
    if (newPassword !== confirmation) {
      setPasswordError("As senhas não coincidem.");
      setPasswordInvalidField("confirmation");
      return;
    }

    setPasswordSaving(true);
    try {
      await trpc.crm.account.changePassword.mutate({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setPasswordSuccess("Senha alterada. As outras sessões foram encerradas.");
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível alterar sua senha.";
      setPasswordError(message);
      setPasswordInvalidField(
        message.toLowerCase().includes("senha atual") ? "currentPassword" : "newPassword",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-6 p-5 sm:p-8 lg:p-10">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-dark">
            <UserRound className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-accent-dark">Sua conta</p>
            <h2 className="font-display m-0 mt-1 text-2xl font-bold tracking-[-0.03em] text-ink sm:text-3xl">
              Minha conta
            </h2>
            <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              Atualize seus dados de acesso e mantenha a conta protegida.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-accent">
            {session.user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="m-0 max-w-56 truncate text-sm font-bold text-ink">{session.user.name}</p>
            <p className="m-0 max-w-56 truncate text-xs text-muted">{session.user.email}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="profile-title">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-soft text-accent-dark">
              <Mail className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="profile-title" className="m-0 text-lg font-bold text-ink">Dados pessoais</h3>
              <p className={secondaryTextClass}>Esses dados identificam você dentro do CRM.</p>
            </div>
          </div>

          <form
            className="mt-6 space-y-5"
            onSubmit={submitProfile}
            aria-describedby={profileError ? "profile-error" : undefined}
          >
            <fieldset disabled={profileSaving} className="m-0 space-y-5 border-0 p-0">
              <div>
                <label htmlFor="account-name" className="text-sm font-semibold text-ink">Nome completo</label>
                <input
                  id="account-name"
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  aria-invalid={profileInvalidField === "name"}
                  aria-describedby={profileInvalidField === "name" ? "profile-error" : undefined}
                />
              </div>
              <div>
                <label htmlFor="account-email" className="text-sm font-semibold text-ink">E-mail</label>
                <input
                  id="account-email"
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  aria-invalid={profileInvalidField === "email"}
                  aria-describedby={profileInvalidField === "email" ? "profile-error" : undefined}
                />
                <p className="mt-2 text-xs leading-5 text-muted">Ao trocar o e-mail, confirme sua senha atual.</p>
              </div>
              {emailChanged && (
                <div className="rounded-xl border border-warning/30 bg-warning-soft/60 p-4">
                  <label htmlFor="profile-current-password" className="text-sm font-semibold text-ink">
                    Senha atual
                  </label>
                  <input
                    id="profile-current-password"
                    className={inputClass}
                    type="password"
                    value={profilePassword}
                    onChange={(event) => setProfilePassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    aria-invalid={profileInvalidField === "currentPassword"}
                    aria-describedby={profileInvalidField === "currentPassword" ? "profile-error" : undefined}
                  />
                  <p className="mb-0 mt-2 text-xs leading-5 text-ink-soft">Usamos a senha somente para confirmar esta alteração.</p>
                </div>
              )}
            </fieldset>
            {profileError && <p id="profile-error" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">{profileError}</p>}
            {profileSuccess && <p className="flex items-center gap-2 rounded-xl bg-positive-soft px-4 py-3 text-sm text-positive" role="status" aria-live="polite"><CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />{profileSuccess}</p>}
            <div className="flex justify-end">
              <button
                className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={profileSaving}
                aria-busy={profileSaving}
              >
                {profileSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {profileSaving ? "Salvando..." : "Salvar dados"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="password-title">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-soft text-accent-dark">
              <KeyRound className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="password-title" className="m-0 text-lg font-bold text-ink">Senha de acesso</h3>
              <p className={secondaryTextClass}>Crie uma senha forte e exclusiva para o CRM.</p>
            </div>
          </div>

          <form
            className="mt-6 space-y-5"
            onSubmit={submitPassword}
            aria-describedby={passwordError ? "password-error" : "password-help"}
          >
            <fieldset disabled={passwordSaving} className="m-0 space-y-5 border-0 p-0">
              <div>
                <label htmlFor="current-password" className="text-sm font-semibold text-ink">Senha atual</label>
                <input
                  id="current-password"
                  className={inputClass}
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  aria-invalid={passwordInvalidField === "currentPassword"}
                  aria-describedby={passwordInvalidField === "currentPassword" ? "password-error" : undefined}
                />
              </div>
              <div>
                <label htmlFor="new-password" className="text-sm font-semibold text-ink">Nova senha</label>
                <input
                  id="new-password"
                  className={inputClass}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  aria-invalid={passwordInvalidField === "newPassword"}
                  aria-describedby={passwordInvalidField === "newPassword" ? "password-help password-error" : "password-help"}
                />
                <p id="password-help" className="mt-2 text-xs leading-5 text-muted">Use de 10 a 128 caracteres.</p>
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-semibold text-ink">Confirmar nova senha</label>
                <input
                  id="confirm-password"
                  className={inputClass}
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  aria-invalid={passwordInvalidField === "confirmation"}
                  aria-describedby={passwordInvalidField === "confirmation" ? "password-error" : undefined}
                />
              </div>
            </fieldset>
            {passwordError && <p id="password-error" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">{passwordError}</p>}
            {passwordSuccess && <p className="flex mt-4 items-center gap-2 rounded-xl bg-positive-soft px-4 py-3 text-sm text-positive" role="status" aria-live="polite"><ShieldCheck className="size-5 shrink-0" aria-hidden="true" />{passwordSuccess}</p>}
            <div className="flex justify-end">
              <button
                className="focus-ring flex h-11 mt-4 items-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-ink transition hover:bg-surface-soft disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={passwordSaving}
                aria-busy={passwordSaving}
              >
                {passwordSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {passwordSaving ? "Alterando..." : "Alterar senha"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
