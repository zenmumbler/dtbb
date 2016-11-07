// domutil.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export function elem<T extends HTMLElement>(sel: string, base: NodeSelector = document) {
	return <T>(base.querySelector(sel));
}


export function elemList<T extends HTMLElement>(sel: string, base: NodeSelector = document) {
	return <T[]>([].slice.call(base.querySelectorAll(sel), 0));
}
