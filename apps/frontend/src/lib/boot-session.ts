export const BOOT_PLAYED_KEY = "volt:boot-played"
const MOTION_PAUSED_STORAGE_KEY = "volt:scene-motion-paused"

// A flag de sessão é gravada dentro do próprio script pré-paint, no instante em
// que ele decide que o boot vai tocar (sem flag prévia, sem pausa, sem
// prefers-reduced-motion) — não depende de um listener de `animationend`
// ligado após a hidratação do React, que pode nunca chegar a tempo (task-10,
// correção de review).
export function bootPrepaintScript(): string {
	const bootKey = JSON.stringify(BOOT_PLAYED_KEY)
	const motionKey = JSON.stringify(MOTION_PAUSED_STORAGE_KEY)
	return `(function(){var played=false;try{played=!!window.sessionStorage.getItem(${bootKey})}catch(e){}if(played){document.documentElement.setAttribute("data-boot-played","")}var paused=false;try{paused=window.localStorage.getItem(${motionKey})==="true"}catch(e){}if(paused){document.documentElement.setAttribute("data-motion-paused","")}if(!played&&!paused){var reduced=false;try{reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}if(!reduced){try{window.sessionStorage.setItem(${bootKey},"true")}catch(e){}}}})();`
}
