import { query as originalQuery } from "@anthropic-ai/claude-agent-sdk";
import { config as loadDotenv } from "dotenv";

// 初始化环境
loadDotenv();

// 替换 $PWD 占位符（如果存在自定义 headers）
if (process.env.ANTHROPIC_CUSTOM_HEADERS) {
	process.env.ANTHROPIC_CUSTOM_HEADERS =
		process.env.ANTHROPIC_CUSTOM_HEADERS.replace("$PWD", process.cwd());
}

export function showConfig(silent = false) {
	if (silent) return;

	console.log("Using API Configuration:");
	console.log("- Base URL:", process.env.ANTHROPIC_BASE_URL);
	console.log("- Token:", process.env.ANTHROPIC_AUTH_TOKEN?.substring(0, 8) + "...");
	console.log("- Custom Headers:", process.env.ANTHROPIC_CUSTOM_HEADERS);
	console.log("- Working Dir:", process.cwd());
	console.log("- Claude Executable Path:", process.env.CLAUDE_EXECUTABLE_PATH);
	console.log("");
}

export function getConfig() {
	return {
		baseUrl: process.env.ANTHROPIC_BASE_URL,
		authToken: process.env.ANTHROPIC_AUTH_TOKEN,
		customHeaders: process.env.ANTHROPIC_CUSTOM_HEADERS,
		workingDir: process.cwd(),
		claudeExecutablePath: process.env.CLAUDE_EXECUTABLE_PATH,
	};
}

// 默认显示配置(可通过环境变量控制)
if (process.env.SHOW_CONFIG !== "false") {
	showConfig();
}

/**
 * Wrapper around the SDK `query` that injects a global default for
 * `pathToClaudeCodeExecutable` from environment/config when the caller
 * doesn't provide one.
 */
// Export a broad type for the agent query object so callers (and TS) can
// access both async-iteration and SDK-specific methods like `setPermissionMode`.
// Reuse the SDK's `query` parameter types wholesale so consumers don't need
// to keep local copies in sync.
type OriginalQueryParams = Parameters<typeof originalQuery>[0];
export type QueryOptions = OriginalQueryParams extends { options?: infer O }
	? O
	: Record<string, any>;

export type AgentQuery = ReturnType<typeof originalQuery>;

export function query(params: { options?: QueryOptions } & { [k: string]: any }): AgentQuery {
	const cfg = getConfig();

	const merged = {
		...params,
		options: {
			...(params.options || {}),
			// prefer global config if provided, otherwise fall back to explicit option
			pathToClaudeCodeExecutable:
				cfg.claudeExecutablePath ?? params?.options?.pathToClaudeCodeExecutable,
		},
	};

	// logging control: prefer explicit per-call messageLogger, then per-call
	// options.logMessages if present, otherwise fall back to env var MESSAGE_LOGS
	const envLogMessages =
		(process.env.MESSAGE_LOGS || "").toLowerCase() === "true" || process.env.MESSAGE_LOGS === "1";

	// Extend options with the local logging helpers we support; SDK options type
	// may not declare these.
	const options = (merged.options ?? {}) as QueryOptions & {
		logMessages?: boolean;
		messageLogger?: (msg: any) => void;
	};

	const logger = (() => {
		if (options.messageLogger && typeof options.messageLogger === "function") return options.messageLogger;
		if (options.logMessages !== undefined)
			return options.logMessages
				? (msg: any) => console.log("Received message:", JSON.stringify(msg, null, 2))
				: null;
		return envLogMessages ? (msg: any) => console.log("Received message:", JSON.stringify(msg, null, 2)) : null;
	})();

	const src: AgentQuery = originalQuery(merged as any) as AgentQuery;

	// Create a transparent Proxy that forwards everything to `src`, but
	// intercepts Symbol.asyncIterator to wrap yielded messages for logging.
	const handler: ProxyHandler<any> = {
		get(target, prop, receiver) {
			// Intercept async iteration
			if (prop === Symbol.asyncIterator) {
				const origIteratorFactory = Reflect.get(target, Symbol.asyncIterator, target);

				// If the target provides a factory, wrap its returned iterator
				if (typeof origIteratorFactory === "function") {
					return function (...args: any[]) {
						const iterator = origIteratorFactory.apply(target, args);
						if (!logger) return iterator;

						// Wrap the iterator with an async generator that logs then yields
						const wrapped = (async function* () {
							for await (const message of iterator) {
								try {
									logger(message);
								} catch (e) {
									console.warn("messageLogger threw:", e);
								}
								yield message;
							}
						})();

						return wrapped;
					};
				}

				// If the target itself looks like an iterator (has next), wrap that
				if (typeof (target as any).next === "function") {
					return function () {
						const iterator = target as any;
						if (!logger) return iterator;
						const wrapped = (async function* () {
							for await (const message of iterator) {
								try {
									logger(message);
								} catch (e) {
									console.warn("messageLogger threw:", e);
								}
								yield message;
							}
						})();
						return wrapped;
					};
				}
			}

			const value = Reflect.get(target, prop, receiver);
			// Ensure methods keep correct `this` binding
			if (typeof value === "function") return value.bind(target);
			return value;
		},
		// Keep transparent behavior for other traps
		has(target, prop) {
			return Reflect.has(target, prop);
		},
		ownKeys(target) {
			return Reflect.ownKeys(target);
		},
		getPrototypeOf(target) {
			return Reflect.getPrototypeOf(target);
		},
	};

	const proxy = new Proxy(src, handler) as AgentQuery;
	return proxy;
}

export default query;
