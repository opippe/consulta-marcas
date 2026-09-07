import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
// Existing production resources, not credentials. Never creates a project/service.
const target = {
  projectId: "0ad58c23-770a-4723-8bc9-960e7eb1c596",
  environmentId: "460a74db-5356-4f10-a48d-32d977b8111f",
  serviceId: "5eca64e2-306d-4f2a-934d-f3d615969c7b",
  provider: "github",
  repository: "opippe/consulta-marcas",
  branch: "main",
  rootDirectory: "/api-bun",
  // Enable Wait for CI separately after the workflow has been pushed to GitHub.
  checkSuites: false,
};
function api(query, variables) {
  const result = spawnSync(process.execPath, [
    "scripts/railway.mjs", "api", query, "--compact",
    "--variables", JSON.stringify(variables),
  ], { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (output.includes("no one in the project has access")) {
      throw new Error("Autorize opippe/consulta-marcas na integração GitHub da sua conta Railway e execute npm run deploy:enable novamente.");
    }
    throw new Error(output.trim() || "Não foi possível consultar o Railway. Execute npm run railway -- login.");
  }
  const response = JSON.parse(result.stdout);
  if (response.errors?.length) throw new Error(response.errors.map(error => error.message).join("\n"));
  return response.data;
}
try {
  const data = api(`query($id: String!) {
    service(id: $id) { name repoTriggers { edges { node { branch repository environmentId } } } }
  }`, { id: target.serviceId });
  const exists = data.service.repoTriggers.edges.some(({ node }) =>
    node.branch === target.branch && node.repository === target.repository && node.environmentId === target.environmentId);
  if (exists) {
    console.info("Deploy automático de main já está habilitado para a API de produção.");
  } else {
    const created = api(`mutation($input: DeploymentTriggerCreateInput!) {
      deploymentTriggerCreate(input: $input) { id branch repository environmentId serviceId }
    }`, { input: target }).deploymentTriggerCreate;
    if (!created?.id || created.branch !== target.branch || created.environmentId !== target.environmentId || created.serviceId !== target.serviceId) {
      throw new Error("Resposta inesperada. Confira os gatilhos no Railway antes de repetir o comando.");
    }
    console.info("Deploy automático habilitado: os próximos pushes em main atualizarão a API, com migrações no pré-deploy.");
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
