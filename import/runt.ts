// runt - mini task thingy
// by Arthur Langereis - @zenmumbler

type TaskFunc = (...args: string[]) => void | Promise<void>;

const tasks = new Map<string, TaskFunc>();

export function task(name: string, action: TaskFunc) {
	tasks.set(name, action);
}

function runTask(name: string): void | Promise<void> {
	const task = tasks.get(name);
	if (! task) {
		console.info(`unknown task: ${name}`);
		return;
	}
	return task.apply(global, process.argv.slice(3));
}

function finished() {
	console.info("All tasks done.");
}

export function runt() {
	const command = process.argv[2];

	if (! command) {
		const allTasks: string[] = [];
		tasks.forEach((_, name) => allTasks.push(name));
		console.info(`no task specified, available: ${allTasks}`);
	}
	else {
		const result = runTask(command);
		if (result instanceof Promise) {
			result.then(finished);
		}
		else {
			finished();
		}
	}
}
