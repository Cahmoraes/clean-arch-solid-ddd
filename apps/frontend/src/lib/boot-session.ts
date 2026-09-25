export const BOOT_PLAYED_KEY = "volt:boot-played"
const MOTION_PAUSED_STORAGE_KEY = "volt:scene-motion-paused"

export function bootPrepaintScript(): string {
	const bootKey = JSON.stringify(BOOT_PLAYED_KEY)
	const motionKey = JSON.stringify(MOTION_PAUSED_STORAGE_KEY)
	return `(function(){try{if(window.sessionStorage.getItem(${bootKey})){document.documentElement.setAttribute("data-boot-played","")}}catch(e){}try{if(window.localStorage.getItem(${motionKey})==="true"){document.documentElement.setAttribute("data-motion-paused","")}}catch(e){}})();`
}

export function markBootPlayed(): void {
	try {
		window.sessionStorage.setItem(BOOT_PLAYED_KEY, "true")
	} catch {
		// armazenamento bloqueado: o boot toca novamente na próxima carga (FR-018)
	}
}
