import { chromium, request } from "@playwright/test";

// QA US-04: verifica "ver minhas notas junto dos feriados" no navegador.
// Pré-requisitos: backend em http://localhost:3333 e frontend em http://localhost:3000.
// Provisiona um usuário via API, cria nota em 2026-10-12 (Nossa Senhora Aparecida),
// injeta o cookie de sessão e captura /calendario.
const BACKEND = "http://localhost:3333";
const CHROMIUM_HEADLESS_SHELL =
	"/Users/ike_m/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const stamp = Date.now().toString(36);
const user = { name: "QA US04", email: `qa-us04-${stamp}@example.com`, password: "Senha123!" };
const api = await request.newContext();
await api.post(`${BACKEND}/users`, { data: user });
const login = await api.post(`${BACKEND}/sessions`, { data: { email: user.email, password: user.password } });
const { token } = await login.json();
await api.post(`${BACKEND}/training-notes`, {
	headers: { Authorization: `Bearer ${token}` },
	data: { data: "2026-10-12", texto: "Leve + mobilidade" },
});

const browser = await chromium.launch({ executablePath: CHROMIUM_HEADLESS_SHELL });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
for (const h of login.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie")) {
	const [pair] = h.value.split(";");
	const eq = pair.indexOf("=");
	await ctx.addCookies([{ name: pair.slice(0, eq), value: pair.slice(eq + 1), domain: "localhost", path: "/", httpOnly: true }]);
}
const page = await ctx.newPage();
await page.goto("http://localhost:3000/calendario", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: "screenshot.png" });
await browser.close();
await api.dispose();
