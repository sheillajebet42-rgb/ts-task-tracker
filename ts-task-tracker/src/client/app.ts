// Browser client, compiled to public/app.js by tsconfig.client.json.
type Status = "todo" | "in_progress" | "done";
interface Task { _id: string; title: string; description: string; status: Status }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let token = sessionStorage.getItem("token") ?? "";

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "request failed");
  return body as T;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
}

async function authenticate(kind: "login" | "register") {
  try {
    const email = $<HTMLInputElement>("email").value;
    const password = $<HTMLInputElement>("password").value;
    const r = await api<{ token: string }>(`/api/auth/${kind}`, { method: "POST", body: JSON.stringify({ email, password }) });
    token = r.token;
    sessionStorage.setItem("token", token);
    await render();
  } catch (e) {
    $("auth-error").textContent = (e as Error).message;
  }
}

async function render() {
  $("auth").hidden = !!token;
  $("board").hidden = !token;
  if (!token) return;
  try {
    const tasks = await api<Task[]>("/api/tasks");
    for (const status of ["todo", "in_progress", "done"] as Status[]) {
      $(`col-${status}`).innerHTML = tasks
        .filter((t) => t.status === status)
        .map((t) => `<li><strong>${escapeHtml(t.title)}</strong><br><small>${escapeHtml(t.description)}</small>
          <div><select data-id="${t._id}">${(["todo", "in_progress", "done"] as Status[])
            .map((s) => `<option value="${s}" ${s === t.status ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}</select>
          <button data-del="${t._id}">✕</button></div></li>`)
        .join("");
    }
  } catch {
    token = "";
    sessionStorage.removeItem("token");
    await render();
  }
}

$("login").addEventListener("click", () => authenticate("login"));
$("register").addEventListener("click", () => authenticate("register"));
$("logout").addEventListener("click", () => { token = ""; sessionStorage.removeItem("token"); void render(); });
$("add").addEventListener("click", async () => {
  const title = $<HTMLInputElement>("title").value.trim();
  if (!title) return;
  await api("/api/tasks", { method: "POST", body: JSON.stringify({ title, description: $<HTMLInputElement>("desc").value }) });
  $<HTMLInputElement>("title").value = "";
  $<HTMLInputElement>("desc").value = "";
  await render();
});
$("board").addEventListener("change", async (e) => {
  const sel = e.target as HTMLSelectElement;
  if (sel.dataset.id) { await api(`/api/tasks/${sel.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) }); await render(); }
});
$("board").addEventListener("click", async (e) => {
  const id = (e.target as HTMLElement).dataset.del;
  if (id) { await api(`/api/tasks/${id}`, { method: "DELETE" }); await render(); }
});

void render();
