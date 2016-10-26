// watchable.ts - part of DTBB (https://github.com/zenmumbler/dtbb)
// (c) 2016 by Arthur Langereis (@zenmumbler)

export type ValueChangedCallback<T> = (newValue: T) => void;

export class Watchable<T> {
	private watchers_: ValueChangedCallback<T>[] = [];
	private purgeableWatchers_: ValueChangedCallback<T>[] = [];
	private notifying_ = false;
	private value_: T;

	constructor(initial: T) {
		this.value_ = initial;
	}

	watch(watcher: ValueChangedCallback<T>) {
		if (this.watchers_.indexOf(watcher) === -1) {
			this.watchers_.push(watcher);
		}
	}

	unwatch(watcher: ValueChangedCallback<T>) {
		const watcherIndex = this.watchers_.indexOf(watcher);
		if (watcherIndex !== -1) {
			if (this.notifying_) {
				this.purgeableWatchers_.push(watcher);
			}
			else {
				this.watchers_.splice(watcherIndex, 1);
			}
		}
	}

	private notify() {
		this.notifying_	= true;
		this.purgeableWatchers_ = [];

		for (const w of this.watchers_) {
			w(this.value_);
		}

		// apply any unwatch() calls made during notification phase
		this.notifying_	= false;
		for (const pw of this.purgeableWatchers_) {
			this.unwatch(pw);
		}
	}

	get() { return this.value_; }

	set(newValue: T) {
		this.value_ = newValue;
		this.notify();
	}

	changed() {
		this.notify();
	}
}
