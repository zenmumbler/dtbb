// domutil.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016-Present by @zenmumbler

export function elem<T extends HTMLElement>(sel: string, base: NodeSelector = document) {
	return base.querySelector(sel) as T;
}


export function elemList<T extends HTMLElement>(sel: string, base: NodeSelector = document) {
	return [].slice.call(base.querySelectorAll(sel), 0) as T[];
}
