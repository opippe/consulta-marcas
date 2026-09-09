import { CheckCircle2, LoaderCircle, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { trpc, type CrmUser } from "./api";

const inputClass = "focus-ring mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-base outline-none";
const buttonClass = "focus-ring rounded-xl border border-line px-4 py-2.5 text-sm font-bold disabled:cursor-wait disabled:opacity-50";

function CreateUserForm({ onCreated, onCancel }: { onCreated: (user: CrmUser) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const created = await trpc.crm.users.create.mutate({ name: name.trim(), email: email.trim(), password });
      setPassword("");
      setConfirmation("");
      onCreated(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="new-user-title" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="new-user-title" className="font-display m-0 text-xl font-bold text-ink">Novo usuário</h2>
      <p className="mt-2 text-sm text-ink-soft">O colaborador terá acesso às operações do CRM. Apenas administradores podem gerenciar usuários.</p>
      <form onSubmit={submit} className="mt-5">
        <fieldset disabled={saving} className="m-0 grid min-w-0 gap-5 border-0 p-0 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">Nome completo
            <input autoFocus className={inputClass} value={name} onChange={event => setName(event.target.value)} autoComplete="off" required minLength={2} maxLength={120} />
          </label>
          <label className="text-sm font-semibold text-ink">E-mail
            <input className={inputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={254} />
          </label>
          <label className="text-sm font-semibold text-ink">Senha de acesso
            <input className={inputClass} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} aria-describedby="user-password-help" />
          </label>
          <label className="text-sm font-semibold text-ink">Confirmar senha
            <input className={inputClass} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} />
          </label>
        </fieldset>
        <p id="user-password-help" className="text-sm text-muted">Use de 10 a 128 caracteres. Compartilhe o e-mail e a senha com o colaborador por um canal seguro; nenhum e-mail será enviado automaticamente.</p>
        {error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" disabled={saving} className={buttonClass} onClick={onCancel}>Cancelar</button>
          <button type="submit" disabled={saving} className={`${buttonClass} flex items-center gap-2 border-transparent bg-ink text-white`}>
            {saving && <LoaderCircle className="size-4 animate-spin" />}{saving ? "Cadastrando..." : "Cadastrar usuário"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function UsersPage({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<CrmUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    trpc.crm.users.list.query().then(result => {
      if (!cancelled) { setUsers(result); setError(""); }
    }).catch(caught => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Não foi possível carregar os usuários.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  async function changeAccess() {
    if (!target || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await trpc.crm.users.setActive.mutate({ id: target.id, active: !target.crmActive });
      setUsers(previous => previous.map(item => item.id === updated.id ? { ...item, crmActive: updated.crmActive } : item));
      setSuccess(`Acesso de ${target.name} ${updated.crmActive ? "ativado" : "desativado"}.`);
      setTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar o acesso.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 p-5 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-display m-0 text-2xl font-bold text-ink">Equipe</h2><p className="mb-0 mt-2 text-base text-ink-soft">Cadastre colaboradores e controle quem pode acessar o CRM.</p></div>
        <button className={`${buttonClass} flex items-center gap-2 border-transparent bg-ink text-white`} disabled={creating || saving || loading} onClick={() => { setCreating(true); setSuccess(""); setTarget(null); }}><Plus className="size-4" />Novo usuário</button>
      </div>
      {success && <p role="status" className="flex items-center gap-2 rounded-xl bg-positive-soft px-4 py-3 text-sm text-positive"><CheckCircle2 className="size-5 shrink-0" />{success}</p>}
      {creating && <CreateUserForm onCancel={() => setCreating(false)} onCreated={created => {
        setUsers(previous => [...previous, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setCreating(false);
        setSuccess(`Usuário ${created.name} cadastrado. O acesso com e-mail e senha já está disponível.`);
      }} />}
      {error && <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}<button className="focus-ring ml-3 underline" disabled={loading || saving} onClick={() => { setLoading(true); setReload(value => value + 1); }}>Atualizar lista</button></div>}
      {target && <section aria-label="Confirmar alteração de acesso" className="rounded-xl border border-line bg-surface p-5">
        <h3 className="m-0 text-base font-bold text-ink">{target.crmActive ? "Desativar" : "Ativar"} o acesso de {target.name}?</h3>
        <p className="text-sm text-ink-soft">{target.crmActive ? "O colaborador será desconectado e não poderá acessar o CRM até ser reativado." : "O colaborador poderá entrar novamente com o mesmo e-mail e senha."}</p>
        <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={saving} onClick={() => setTarget(null)}>Cancelar</button><button className={`${buttonClass} bg-ink text-white`} disabled={saving} onClick={() => void changeAccess()}>{saving ? "Salvando..." : "Confirmar"}</button></div>
      </section>}
      <section aria-label="Usuários cadastrados" className="overflow-hidden rounded-xl border border-line bg-surface">
        {loading ? <div role="status" className="flex min-h-52 items-center justify-center gap-3 text-sm text-accent-dark"><LoaderCircle className="size-5 animate-spin" />Carregando usuários...</div> : users.length === 0 ? <div className="p-10 text-center text-ink-soft"><UsersRound className="mx-auto mb-3 size-8" /><p>{error ? "A lista de usuários está indisponível." : "Nenhum usuário cadastrado."}</p></div> : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-soft/60 text-muted"><tr><th className="px-5 py-4">Usuário</th><th className="px-5 py-4">Perfil</th><th className="px-5 py-4">Acesso</th><th className="px-5 py-4"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{users.map(item => <tr key={item.id} className="border-b border-line last:border-0">
              <td className="px-5 py-4"><strong className="block text-ink">{item.name}{item.id === currentUserId && <span className="ml-2 font-normal text-muted">(você)</span>}</strong><span className="mt-1 block break-all text-muted">{item.email}</span></td>
              <td className="px-5 py-4 text-ink-soft"><span className="flex items-center gap-2">{item.crmRole === "ADMIN" && <ShieldCheck className="size-4 shrink-0" />}{item.crmRole === "ADMIN" ? "Administrador" : "Colaborador"}</span></td>
              <td className="px-5 py-4"><span className={`inline-block rounded-full px-3 py-1 font-semibold ${item.crmActive ? "bg-positive-soft text-positive" : "bg-surface-soft text-muted"}`}>{item.crmActive ? "Ativo" : "Inativo"}</span></td>
              <td className="px-5 py-4 text-right">{item.crmRole !== "ADMIN" && item.id !== currentUserId && <button className={buttonClass} disabled={saving || creating} aria-label={`${item.crmActive ? "Desativar" : "Ativar"} acesso de ${item.name}`} onClick={() => { setTarget(item); setSuccess(""); }}>{item.crmActive ? "Desativar" : "Ativar"}</button>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
