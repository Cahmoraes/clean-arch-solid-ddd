const SELETOR_EDITAVEL =
	'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

function alvoEditavel(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(SELETOR_EDITAVEL) !== null
}

/** As setas só trocam de mês fora de campos editáveis e sem gaveta ou diálogo aberto. */
export function isMonthShortcutBlocked(
	event: KeyboardEvent,
	overlayOpen: boolean,
): boolean {
	return overlayOpen || event.defaultPrevented || alvoEditavel(event.target)
}
