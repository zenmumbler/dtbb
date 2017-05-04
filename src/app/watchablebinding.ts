// watchablebinding.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

import { Watchable } from "../lib/watchable";

export class WatchableInputBinding<T extends (string | number | boolean)> {
	private broadcastFn_?: (v: T) => void;
	private acceptFn_?: (v: T) => void;
	private getFn_?: (e: HTMLElement) => T;
	private setFn_?: (e: HTMLElement, v: T) => void;

	constructor(private watchable_: Watchable<T>, private elems_: HTMLElement[]) {
		for (const elem of elems_) {
			this.bindElement(elem);
		}

		watchable_.watch(newVal => {
			this.acceptChange(newVal);
		});
	}

	broadcast(fn: (v: T) => void) {
		this.broadcastFn_ = fn;
		return this;
	}

	accept(fn: (v: T) => void) {
		this.acceptFn_ = fn;
		return this;
	}

	get(fn: (e: HTMLElement) => T) {
		this.getFn_ = fn;
		return this;
	}

	set(fn: (e: HTMLElement, v: T) => void) {
		this.setFn_ = fn;
		return this;
	}

	private broadcastChange(newValue: T) {
		if (this.broadcastFn_) {
			this.broadcastFn_(newValue);
		}
	}

	private acceptChange(newValue: T) {
		if (this.acceptFn_) {
			this.acceptFn_(newValue);
		}
		else {
			const watchableValue = String(newValue);

			for (const elem of this.elems_) {
				const currentValue = this.getElementValue(elem);
				if (watchableValue !== currentValue) {
					this.setElementValue(elem, newValue);
				}
			}
		}
	}

	private getElementValue(elem: HTMLElement): string | undefined {
		if (this.getFn_) {
			return String(this.getFn_(elem));
		}

		const tag = elem.nodeName.toLowerCase();
		switch (tag) {
			case "select":
			case "textarea":
				return (elem as (HTMLSelectElement & HTMLTextAreaElement)).value;

			case "input": {
				const type = (elem as HTMLInputElement).type;
				if (type === "radio" || type === "checkbox") {
					return (elem as HTMLInputElement).checked ? (elem as HTMLInputElement).value : undefined;
				}
				return (elem as HTMLInputElement).value;
			}
			default:
				return elem.textContent || "";
		}
	}

	private setElementValue(elem: HTMLElement, newValue: T) {
		if (this.setFn_) {
			this.setFn_(elem, newValue);
			return;
		}

		const tag = elem.nodeName.toLowerCase();
		switch (tag) {
			case "select":
			case "textarea":
				(elem as HTMLSelectElement & HTMLTextAreaElement).value = String(newValue);
				break;

			case "input": {
				const type = (elem as HTMLInputElement).type;
				if (type === "radio" || type === "checkbox") {
					(elem as HTMLInputElement).checked = (newValue === (elem as HTMLInputElement).value);
				}
				else {
					(elem as HTMLInputElement).value = String(newValue);
				}
				break;
			}
			default:
				elem.textContent = String(newValue);
				break;
		}
	}

	private bindElement(elem: HTMLElement) {
		const tag = elem.nodeName.toLowerCase();
		const type = (elem as HTMLInputElement).type;
		let eventName: string;
		if (tag === "input" && (type === "radio" || type === "checkbox")) {
			eventName = "change";
		}
		else {
			eventName = "input";
		}

		elem.addEventListener(eventName, _ => {
			const valueStr = this.getElementValue(elem);
			if (valueStr === undefined) {
				return;
			}

			const watchableType = typeof this.watchable_.get();
			if (watchableType === "number") {
				let value: number;
				value = parseFloat(valueStr);
				this.broadcastChange(value as T);
			}
			else if (watchableType === "boolean") {
				let value: boolean;
				value = (valueStr === "true");
				this.broadcastChange(value as T);
			}
			else if (watchableType === "string") {
				let value: string;
				value = valueStr;
				this.broadcastChange(value as T);
			}
			else {
				console.warn(`Don't know what to do with a watchable of type ${watchableType}`);
			}
		});
	}
}

export function watchableBinding<T extends (number | string | boolean)>(w: Watchable<T>, element: HTMLElement | HTMLElement[]): WatchableInputBinding<T>;
export function watchableBinding<T extends (number | string | boolean)>(w: Watchable<T>, selector: string, context?: NodeSelector): WatchableInputBinding<T>;
export function watchableBinding<T extends (number | string | boolean)>(w: Watchable<T>, elemOrSel: string | HTMLElement | HTMLElement[], context?: NodeSelector) {
	const elems = (
		(typeof elemOrSel === "string")
		? ([].slice.call((context || document).querySelectorAll(elemOrSel)) as HTMLElement[])
		: (Array.isArray(elemOrSel) ? elemOrSel : [elemOrSel])
	);
	return new WatchableInputBinding<T>(w, elems);
}
