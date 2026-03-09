import { Alert, Button, Card, Flex, Space, Table, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import FormbarHeader from "../components/FormbarHeader";
import { getAppearAnimation, useSettings, useUserData } from "../main";
import { accessToken, formbarUrl, refreshToken } from "../socket";
import { type CurrentUserData } from "../types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type TestStatus = "pending" | "running" | "passed" | "failed" | "skipped";
type SwaggerParameterLocation = "path" | "query" | "header" | "cookie";

type ApiResponse = {
	ok: boolean;
	status: number;
	body: unknown;
	rawText: string;
};

type TestResult = {
	key: string;
	category: string;
	label: string;
	method: HttpMethod;
	path: string;
	status: TestStatus;
	statusCode?: number;
	details: string;
	durationMs?: number;
};

type StaticIssue = {
	key: string;
	category: string;
	method: HttpMethod;
	path: string;
	reason: string;
};

type SwaggerSchema = {
	$ref?: string;
	type?: string;
	format?: string;
	enum?: unknown[];
	default?: unknown;
	example?: unknown;
	items?: SwaggerSchema;
	properties?: Record<string, SwaggerSchema>;
	required?: string[];
	additionalProperties?: boolean | SwaggerSchema;
	nullable?: boolean;
	allOf?: SwaggerSchema[];
	anyOf?: SwaggerSchema[];
	oneOf?: SwaggerSchema[];
	minimum?: number;
	maximum?: number;
};

type SwaggerExample = {
	value?: unknown;
};

type SwaggerParameter = {
	name?: string;
	in?: SwaggerParameterLocation;
	required?: boolean;
	description?: string;
	schema?: SwaggerSchema;
	example?: unknown;
	examples?: Record<string, SwaggerExample>;
};

type SwaggerMediaType = {
	schema?: SwaggerSchema;
	example?: unknown;
	examples?: Record<string, SwaggerExample>;
};

type SwaggerRequestBody = {
	required?: boolean;
	content?: Record<string, SwaggerMediaType>;
};

type SwaggerResponse = {
	description?: string;
	content?: Record<string, SwaggerMediaType>;
};

type SwaggerOperationDefinition = {
	summary?: string;
	description?: string;
	tags?: unknown[];
	security?: Array<Record<string, unknown>>;
	parameters?: SwaggerParameter[];
	requestBody?: SwaggerRequestBody;
	responses?: Record<string, SwaggerResponse>;
};

type SwaggerPathItem = Partial<
	Record<Lowercase<HttpMethod>, SwaggerOperationDefinition>
> & {
	parameters?: SwaggerParameter[];
};

type SwaggerSpecExtension = {
	nodeEnv?: string;
};

type SwaggerSpec = {
	paths?: Record<string, SwaggerPathItem>;
	components?: {
		schemas?: Record<string, SwaggerSchema>;
	};
	"x-formbar"?: SwaggerSpecExtension;
	info?: {
		"x-formbar"?: SwaggerSpecExtension;
	};
};

type SwaggerOperation = {
	key: string;
	category: string;
	label: string;
	method: HttpMethod;
	path: string;
	apiPath: string;
	summary: string;
	parameters: SwaggerParameter[];
	security: Array<Record<string, unknown>>;
	requestBody?: SwaggerRequestBody;
	requestContentType: string | null;
	autoRunBlocker: string | null;
	presetPathParams: Record<string, string>;
	resourceNames: string[];
};

type CurrentLoginData = CurrentUserData & {
	classId?: number | null;
	digipogs?: number;
};

type ValuePool = {
	byName: Map<string, string[]>;
	byResource: Map<string, Map<string, string[]>>;
};

type TestingContext = {
	me: CurrentLoginData;
	valuePool: ValuePool;
};

type PreparedRequestBody = {
	contentType: string;
	value: unknown;
};

type RequestPreparationResult =
	| {
			ok: true;
			path: string;
			headers: Record<string, string>;
			body?: PreparedRequestBody;
	  }
	| {
			ok: false;
			reason: string;
	  };

type SwaggerLoadResult = {
	spec: SwaggerSpec;
	operations: SwaggerOperation[];
	serverNodeEnv: string;
};

type SchemaValueBuildOptions = {
	explicitOnly?: boolean;
	parameterMode?: boolean;
	propertyName?: string;
	resourceNames?: string[];
	valuePool?: ValuePool;
	currentUser?: CurrentLoginData;
	seenRefs?: Set<string>;
};

const SUPPORTED_HTTP_METHODS: HttpMethod[] = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
];
const SUPPORTED_REQUEST_CONTENT_TYPES = [
	"application/json",
	"application/x-www-form-urlencoded",
	"text/plain",
] as const;
const AUTO_TEST_EMAIL = `autotest+${Date.now()}@example.com`;
const AUTO_TEST_PASSWORD = "Password123!";
const AUTO_TEST_DISPLAY_NAME = "Auto Test User";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getResponseData<T>(payload: unknown): T | undefined {
	if (!isRecord(payload) || !("data" in payload)) {
		return undefined;
	}
	return payload.data as T;
}

function truncate(value: string, limit = 160): string {
	return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function summarizePayload(payload: unknown): string {
	if (typeof payload === "string") {
		return truncate(payload);
	}

	if (isRecord(payload)) {
		if ("error" in payload) {
			const errorValue = payload.error;
			if (typeof errorValue === "string") {
				return truncate(errorValue);
			}
			if (
				isRecord(errorValue) &&
				typeof errorValue.message === "string"
			) {
				return truncate(errorValue.message);
			}
		}

		if ("message" in payload && typeof payload.message === "string") {
			return truncate(payload.message);
		}
	}

	try {
		return truncate(JSON.stringify(payload));
	} catch {
		return "Response received.";
	}
}

function getStatusTag(status: TestStatus) {
	switch (status) {
		case "passed":
			return <Tag color="green">Passed</Tag>;
		case "failed":
			return <Tag color="red">Failed</Tag>;
		case "running":
			return <Tag color="blue">Running</Tag>;
		case "skipped":
			return <Tag color="orange">Skipped</Tag>;
		default:
			return <Tag>Pending</Tag>;
	}
}

function compareMethods(left: HttpMethod, right: HttpMethod) {
	return (
		SUPPORTED_HTTP_METHODS.indexOf(left) -
		SUPPORTED_HTTP_METHODS.indexOf(right)
	);
}

function countPathParams(path: string) {
	const matches = path.match(/\{/g);
	return matches ? matches.length : 0;
}

function normalizeApiPath(path: string) {
	return path.startsWith("/api/v1")
		? path.slice("/api/v1".length) || "/"
		: path;
}

function getOperationSummary(definition: SwaggerOperationDefinition) {
	if (
		typeof definition.summary === "string" &&
		definition.summary.length > 0
	) {
		return definition.summary;
	}

	if (
		typeof definition.description === "string" &&
		definition.description.length > 0
	) {
		return truncate(definition.description.replace(/\s+/g, " "), 120);
	}

	return "";
}

function mergeParameters(
	pathParameters: SwaggerParameter[] = [],
	operationParameters: SwaggerParameter[] = [],
) {
	const merged = new Map<string, SwaggerParameter>();

	for (const parameter of pathParameters) {
		if (!parameter.name || !parameter.in) {
			continue;
		}
		merged.set(`${parameter.in}:${parameter.name}`, parameter);
	}

	for (const parameter of operationParameters) {
		if (!parameter.name || !parameter.in) {
			continue;
		}
		merged.set(`${parameter.in}:${parameter.name}`, parameter);
	}

	return Array.from(merged.values());
}

function getExampleValueFromMap(examples?: Record<string, SwaggerExample>) {
	if (!examples) {
		return undefined;
	}

	for (const example of Object.values(examples)) {
		if (example?.value !== undefined) {
			return example.value;
		}
	}

	return undefined;
}

function getParameterSeedValue(parameter: SwaggerParameter) {
	if (parameter.example !== undefined) {
		return parameter.example;
	}

	const mappedExample = getExampleValueFromMap(parameter.examples);
	if (mappedExample !== undefined) {
		return mappedExample;
	}

	if (parameter.schema?.example !== undefined) {
		return parameter.schema.example;
	}

	if (parameter.schema?.default !== undefined) {
		return parameter.schema.default;
	}

	if (
		Array.isArray(parameter.schema?.enum) &&
		parameter.schema.enum.length > 0
	) {
		return parameter.schema.enum[0];
	}

	return undefined;
}

function stringifyParameterValue(value: unknown): string | null {
	if (value == null) {
		return null;
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	return null;
}

function cloneValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => cloneValue(item));
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [
				key,
				cloneValue(entry),
			]),
		);
	}

	return value;
}

function singularizeWord(value: string) {
	if (value.endsWith("ies")) {
		return `${value.slice(0, -3)}y`;
	}

	if (value.endsWith("sses")) {
		return value.slice(0, -2);
	}

	if (value.endsWith("s") && !value.endsWith("ss")) {
		return value.slice(0, -1);
	}

	return value;
}

function pluralizeWord(value: string) {
	if (value.endsWith("y")) {
		return `${value.slice(0, -1)}ies`;
	}

	return value.endsWith("s") ? value : `${value}s`;
}

function normalizeLookupKey(value: string) {
	return value.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

function getLookupAliases(value?: string) {
	if (!value) {
		return [];
	}

	const tokens = value
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.split(/[^a-zA-Z0-9]+/)
		.map((token) => token.toLowerCase())
		.filter(Boolean);

	if (tokens.length === 0) {
		return [];
	}

	const aliases = new Set<string>();
	aliases.add(tokens.join(""));
	aliases.add(singularizeWord(tokens.join("")));
	aliases.add(pluralizeWord(singularizeWord(tokens.join(""))));

	for (const token of tokens) {
		aliases.add(token);
		aliases.add(singularizeWord(token));
		aliases.add(pluralizeWord(singularizeWord(token)));
	}

	if (tokens.length > 1) {
		aliases.add(tokens.slice(1).join(""));
		aliases.add(tokens.slice(0, -1).join(""));
	}

	return Array.from(aliases)
		.map((alias) => normalizeLookupKey(alias))
		.filter(Boolean);
}

function pushUniqueValue(
	map: Map<string, string[]>,
	key: string,
	value: string,
) {
	const current = map.get(key);
	if (!current) {
		map.set(key, [value]);
		return;
	}

	if (!current.includes(value)) {
		current.push(value);
	}
}

function getOrCreateResourceMap(
	pool: ValuePool,
	resourceName: string,
): Map<string, string[]> {
	const normalizedResource = normalizeLookupKey(resourceName);
	const existing = pool.byResource.get(normalizedResource);
	if (existing) {
		return existing;
	}

	const created = new Map<string, string[]>();
	pool.byResource.set(normalizedResource, created);
	return created;
}

function createValuePool(): ValuePool {
	return {
		byName: new Map(),
		byResource: new Map(),
	};
}

function addValueToPool(
	pool: ValuePool,
	name: string | undefined,
	value: unknown,
	resourceNames: string[] = [],
) {
	const stringValue = stringifyParameterValue(value);
	if (!stringValue) {
		return;
	}

	const nameAliases = name ? getLookupAliases(name) : ["value"];
	for (const alias of nameAliases) {
		pushUniqueValue(pool.byName, alias, stringValue);
	}

	for (const resourceName of resourceNames) {
		for (const resourceAlias of getLookupAliases(resourceName)) {
			const resourceMap = getOrCreateResourceMap(pool, resourceAlias);
			for (const alias of nameAliases) {
				pushUniqueValue(resourceMap, alias, stringValue);
			}
		}
	}
}

function harvestValuePool(
	pool: ValuePool,
	value: unknown,
	options: {
		resourceNames?: string[];
		propertyName?: string;
	} = {},
) {
	const resourceNames = options.resourceNames ?? [];

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		addValueToPool(pool, options.propertyName, value, resourceNames);
		return;
	}

	if (Array.isArray(value)) {
		const nextResourceNames = options.propertyName
			? [...resourceNames, options.propertyName]
			: resourceNames;

		for (const entry of value) {
			if (
				typeof entry === "string" ||
				typeof entry === "number" ||
				typeof entry === "boolean"
			) {
				addValueToPool(
					pool,
					options.propertyName,
					entry,
					nextResourceNames,
				);
				addValueToPool(
					pool,
					options.propertyName
						? singularizeWord(options.propertyName)
						: "value",
					entry,
					nextResourceNames,
				);
				continue;
			}

			harvestValuePool(pool, entry, {
				resourceNames: nextResourceNames,
			});
		}
		return;
	}

	if (!isRecord(value)) {
		return;
	}

	const nextResourceNames = options.propertyName
		? [...resourceNames, options.propertyName]
		: resourceNames;

	for (const [key, entry] of Object.entries(value)) {
		if (
			typeof entry === "string" ||
			typeof entry === "number" ||
			typeof entry === "boolean"
		) {
			addValueToPool(pool, key, entry, nextResourceNames);
			continue;
		}

		harvestValuePool(pool, entry, {
			resourceNames: nextResourceNames,
			propertyName: key,
		});
	}
}

function findValueInPool(
	pool: ValuePool | undefined,
	names: string[],
	resourceNames: string[] = [],
) {
	if (!pool) {
		return null;
	}

	const normalizedNames = Array.from(
		new Set(names.flatMap((name) => getLookupAliases(name))),
	);
	const normalizedResources = Array.from(
		new Set(
			resourceNames.flatMap((resourceName) =>
				getLookupAliases(resourceName),
			),
		),
	);

	for (const resourceName of normalizedResources) {
		const resourceMap = pool.byResource.get(resourceName);
		if (!resourceMap) {
			continue;
		}

		for (const name of normalizedNames) {
			const values = resourceMap.get(name);
			if (values && values.length > 0) {
				return values[0];
			}
		}
	}

	for (const name of normalizedNames) {
		const values = pool.byName.get(name);
		if (values && values.length > 0) {
			return values[0];
		}
	}

	return null;
}

function coerceStringToSchemaValue(value: string, schema?: SwaggerSchema) {
	if (!schema) {
		return value;
	}

	if (Array.isArray(schema.enum) && schema.enum.length > 0) {
		const matchingEnumValue = schema.enum.find(
			(entry) => String(entry) === value,
		);
		if (matchingEnumValue !== undefined) {
			return matchingEnumValue;
		}

		return cloneValue(schema.enum[0]);
	}

	if (schema.type === "integer" || schema.type === "number") {
		const numericValue = Number(value);
		return Number.isFinite(numericValue)
			? schema.type === "integer"
				? Math.trunc(numericValue)
				: numericValue
			: undefined;
	}

	if (schema.type === "boolean") {
		if (value === "true") {
			return true;
		}
		if (value === "false") {
			return false;
		}
		return undefined;
	}

	return value;
}

function resolveSchemaReference(
	ref: string,
	spec: SwaggerSpec,
): SwaggerSchema | undefined {
	const prefix = "#/components/schemas/";
	if (!ref.startsWith(prefix)) {
		return undefined;
	}

	const schemaName = ref.slice(prefix.length);
	return spec.components?.schemas?.[schemaName];
}

function getSchemaPoolValue(
	schema: SwaggerSchema | undefined,
	options: SchemaValueBuildOptions,
) {
	const resourceNames = options.resourceNames ?? [];
	const propertyNames = options.propertyName ? [options.propertyName] : [];

	if (schema?.format === "email") {
		propertyNames.unshift("email");
	}

	if (schema?.format === "uri") {
		propertyNames.unshift("url");
	}

	if (propertyNames.length === 0) {
		return undefined;
	}

	const pooledValue = findValueInPool(
		options.valuePool,
		propertyNames,
		resourceNames,
	);
	if (!pooledValue) {
		return undefined;
	}

	return coerceStringToSchemaValue(pooledValue, schema);
}

function getGeneratedSchemaValue(
	schema: SwaggerSchema | undefined,
	options: SchemaValueBuildOptions,
) {
	if (!schema) {
		return undefined;
	}

	const propertyName = options.propertyName ?? "";
	const normalizedPropertyName = normalizeLookupKey(propertyName);

	if (schema.type === "boolean") {
		return true;
	}

	if (schema.type === "integer" || schema.type === "number") {
		if (
			normalizedPropertyName.includes("offset") ||
			normalizedPropertyName.includes("index")
		) {
			return 0;
		}

		if (normalizedPropertyName.includes("limit")) {
			return 5;
		}

		const minimum =
			typeof schema.minimum === "number" ? schema.minimum : undefined;
		if (minimum !== undefined) {
			return minimum > 0 ? minimum : 0;
		}

		return 1;
	}

	if (schema.type === "string" || schema.format || schema.type == null) {
		if (
			schema.format === "email" ||
			normalizedPropertyName.includes("email")
		) {
			return options.currentUser?.email || AUTO_TEST_EMAIL;
		}

		if (
			schema.format === "password" ||
			normalizedPropertyName.includes("password")
		) {
			return AUTO_TEST_PASSWORD;
		}

		if (
			normalizedPropertyName.includes("refreshtoken") ||
			normalizedPropertyName === "token"
		) {
			return refreshToken || accessToken || undefined;
		}

		if (normalizedPropertyName.includes("accesstoken")) {
			return accessToken || refreshToken || undefined;
		}

		if (normalizedPropertyName.includes("pin")) {
			return "1234";
		}

		if (schema.format === "uri" || normalizedPropertyName.includes("url")) {
			return "https://example.com";
		}

		if (normalizedPropertyName.includes("displayname")) {
			return options.currentUser?.displayName || AUTO_TEST_DISPLAY_NAME;
		}

		if (
			normalizedPropertyName.includes("reason") ||
			normalizedPropertyName.includes("message")
		) {
			return "Automated test payload";
		}

		if (normalizedPropertyName.includes("prompt")) {
			return "Automated test prompt";
		}

		if (normalizedPropertyName.includes("code")) {
			return (
				findValueInPool(
					options.valuePool,
					[propertyName, "code", "key"],
					options.resourceNames ?? [],
				) || "test-code"
			);
		}

		if (normalizedPropertyName.includes("name")) {
			return AUTO_TEST_DISPLAY_NAME;
		}

		if (options.parameterMode) {
			return undefined;
		}

		return "test";
	}

	return undefined;
}

function buildValueFromSchema(
	schema: SwaggerSchema | undefined,
	spec: SwaggerSpec,
	options: SchemaValueBuildOptions = {},
): unknown {
	if (!schema) {
		return undefined;
	}

	if (schema.$ref) {
		const seenRefs = options.seenRefs ?? new Set<string>();
		if (seenRefs.has(schema.$ref)) {
			return undefined;
		}

		const resolved = resolveSchemaReference(schema.$ref, spec);
		if (!resolved) {
			return undefined;
		}

		const nextSeenRefs = new Set(seenRefs);
		nextSeenRefs.add(schema.$ref);
		return buildValueFromSchema(resolved, spec, {
			...options,
			seenRefs: nextSeenRefs,
		});
	}

	if (schema.example !== undefined) {
		return cloneValue(schema.example);
	}

	if (schema.default !== undefined) {
		return cloneValue(schema.default);
	}

	if (Array.isArray(schema.enum) && schema.enum.length > 0) {
		return cloneValue(schema.enum[0]);
	}

	if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
		const mergedObject: Record<string, unknown> = {};
		let hasObjectValue = false;

		for (const entry of schema.allOf) {
			const value = buildValueFromSchema(entry, spec, options);
			if (isRecord(value)) {
				Object.assign(mergedObject, value);
				hasObjectValue = true;
				continue;
			}

			if (value !== undefined && !hasObjectValue) {
				return value;
			}
		}

		return hasObjectValue ? mergedObject : undefined;
	}

	for (const branch of [schema.oneOf, schema.anyOf]) {
		if (!Array.isArray(branch)) {
			continue;
		}

		for (const entry of branch) {
			const value = buildValueFromSchema(entry, spec, options);
			if (value !== undefined) {
				return value;
			}
		}
	}

	if (!options.explicitOnly) {
		const poolValue = getSchemaPoolValue(schema, options);
		if (poolValue !== undefined) {
			return poolValue;
		}
	}

	if (schema.type === "array" || schema.items) {
		const itemValue = buildValueFromSchema(schema.items, spec, {
			...options,
			propertyName: options.propertyName
				? singularizeWord(options.propertyName)
				: options.propertyName,
		});
		if (itemValue !== undefined) {
			return [itemValue];
		}

		return options.explicitOnly ? undefined : [];
	}

	if (
		schema.type === "object" ||
		schema.properties ||
		schema.additionalProperties
	) {
		const objectValue: Record<string, unknown> = {};
		const properties = schema.properties ?? {};

		for (const [propertyName, propertySchema] of Object.entries(
			properties,
		)) {
			const propertyValue = buildValueFromSchema(propertySchema, spec, {
				...options,
				propertyName,
				resourceNames: [...(options.resourceNames ?? []), propertyName],
			});

			if (propertyValue !== undefined) {
				objectValue[propertyName] = propertyValue;
			}
		}

		if (Object.keys(objectValue).length > 0) {
			return objectValue;
		}

		if (
			!options.explicitOnly &&
			schema.additionalProperties &&
			schema.additionalProperties !== true
		) {
			const additionalValue = buildValueFromSchema(
				schema.additionalProperties,
				spec,
				{
					...options,
					propertyName: "value",
				},
			);

			if (additionalValue !== undefined) {
				return { sample: additionalValue };
			}
		}

		return options.explicitOnly ? undefined : {};
	}

	if (!options.explicitOnly) {
		return getGeneratedSchemaValue(schema, options);
	}

	return undefined;
}

function getMediaTypeExample(
	mediaType: SwaggerMediaType | undefined,
	spec: SwaggerSpec,
	options: SchemaValueBuildOptions = {},
) {
	if (!mediaType) {
		return undefined;
	}

	if (mediaType.example !== undefined) {
		return cloneValue(mediaType.example);
	}

	const mappedExample = getExampleValueFromMap(mediaType.examples);
	if (mappedExample !== undefined) {
		return cloneValue(mappedExample);
	}

	return buildValueFromSchema(mediaType.schema, spec, options);
}

function resolveSchema(
	schema: SwaggerSchema | undefined,
	spec: SwaggerSpec,
): SwaggerSchema | undefined {
	if (!schema?.$ref) {
		return schema;
	}

	const resolved = resolveSchemaReference(schema.$ref, spec);
	if (!resolved) {
		return schema;
	}

	return resolveSchema(resolved, spec) ?? resolved;
}

function isJsonRootValueCompatible(
	value: unknown,
	schema: SwaggerSchema | undefined,
	spec: SwaggerSpec,
): boolean {
	const resolvedSchema = resolveSchema(schema, spec);
	if (!resolvedSchema) {
		return true;
	}

	if (
		resolvedSchema.type === "object" ||
		resolvedSchema.properties ||
		resolvedSchema.additionalProperties
	) {
		return isRecord(value);
	}

	if (resolvedSchema.type === "array" || resolvedSchema.items) {
		return Array.isArray(value);
	}

	if (resolvedSchema.type === "string") {
		return typeof value === "string";
	}

	if (resolvedSchema.type === "integer" || resolvedSchema.type === "number") {
		return typeof value === "number";
	}

	if (resolvedSchema.type === "boolean") {
		return typeof value === "boolean";
	}

	if (resolvedSchema.nullable && value === null) {
		return true;
	}

	return true;
}

function isSupportedRequestContentType(contentType: string) {
	return SUPPORTED_REQUEST_CONTENT_TYPES.includes(
		contentType as (typeof SUPPORTED_REQUEST_CONTENT_TYPES)[number],
	);
}

function getPreferredRequestContentType(requestBody?: SwaggerRequestBody) {
	if (!requestBody?.content) {
		return null;
	}

	for (const preferredType of SUPPORTED_REQUEST_CONTENT_TYPES) {
		if (requestBody.content[preferredType]) {
			return preferredType;
		}
	}

	const [firstContentType] = Object.keys(requestBody.content);
	return firstContentType ?? null;
}

function getOperationResourceNames(apiPath: string) {
	return Array.from(
		new Set(
			apiPath
				.split("/")
				.filter(Boolean)
				.filter((segment) => !/^\{[^}]+\}$/.test(segment))
				.map((segment) => singularizeWord(segment)),
		),
	);
}

function getParameterResourceNames(apiPath: string, parameterName?: string) {
	const segments = apiPath.split("/").filter(Boolean);
	const resourceNames: string[] = [];
	const token = parameterName ? `{${parameterName}}` : null;

	if (token) {
		segments.forEach((segment, index) => {
			if (segment !== token) {
				return;
			}

			const previousSegment = segments[index - 1];
			const nextSegment = segments[index + 1];
			if (previousSegment && !/^\{[^}]+\}$/.test(previousSegment)) {
				resourceNames.push(previousSegment);
			}
			if (nextSegment && !/^\{[^}]+\}$/.test(nextSegment)) {
				resourceNames.push(nextSegment);
			}
		});
	}

	return Array.from(
		new Set([...resourceNames, ...getOperationResourceNames(apiPath)]),
	);
}

function supportsBrowserSessionAuth(security: Array<Record<string, unknown>>) {
	if (security.length === 0) {
		return true;
	}

	return security.some((requirement) => {
		const keys = Object.keys(requirement);
		return keys.length === 0 || keys.includes("bearerAuth");
	});
}

function getServerNodeEnv(spec: SwaggerSpec) {
	const rawEnv =
		spec["x-formbar"]?.nodeEnv ??
		spec.info?.["x-formbar"]?.nodeEnv ??
		"production";
	return `${rawEnv}`.trim().toLowerCase() || "production";
}

function isSensitivePasswordOperation(apiPath: string) {
	return apiPath
		.split("/")
		.filter(Boolean)
		.map((segment) => normalizeLookupKey(segment))
		.includes("password");
}

function isDestructiveOperation(method: HttpMethod) {
	return method === "DELETE";
}

function getAutoRunBlocker(
	operation: Pick<
		SwaggerOperation,
		"apiPath" | "method" | "security" | "parameters" | "requestContentType"
	>,
	serverNodeEnv: string,
) {
	if (isDestructiveOperation(operation.method)) {
		return "DELETE endpoints are always excluded from auto-run to avoid destructive actions against real data.";
	}

	if (isSensitivePasswordOperation(operation.apiPath)) {
		return "Password-management endpoints are always excluded from auto-run to avoid changing credentials.";
	}

	if (!supportsBrowserSessionAuth(operation.security)) {
		return "Requires credentials that the browser session does not expose automatically.";
	}

	const cookieParameter = operation.parameters.find(
		(parameter) => parameter.in === "cookie",
	);
	if (cookieParameter) {
		return "Requires cookie parameters that the browser runner cannot set explicitly.";
	}

	if (
		operation.requestContentType &&
		!isSupportedRequestContentType(operation.requestContentType)
	) {
		return `Request body content type "${operation.requestContentType}" is not supported by the browser runner.`;
	}

	if (operation.method !== "GET" && serverNodeEnv !== "development") {
		return `Mutating endpoints only auto-run when the server reports NODE_ENV=development (current: ${serverNodeEnv}).`;
	}

	return null;
}

function renderPathTemplate(
	apiPath: string,
	pathParams: Record<string, string> = {},
) {
	return apiPath.replace(/\{([^}]+)\}/g, (_, name: string) => {
		return pathParams[name] ?? `{${name}}`;
	});
}

function expandOperationVariants(
	operation: Omit<SwaggerOperation, "key" | "path">,
) {
	const expandablePathParameters = operation.parameters.filter(
		(parameter) =>
			parameter.in === "path" &&
			parameter.name &&
			!operation.presetPathParams[parameter.name] &&
			Array.isArray(parameter.schema?.enum) &&
			parameter.schema.enum.length > 0 &&
			parameter.schema.enum.every(
				(value) =>
					typeof value === "string" ||
					typeof value === "number" ||
					typeof value === "boolean",
			),
	);

	if (expandablePathParameters.length !== 1) {
		return [
			{
				...operation,
				key: `${operation.method}:${operation.apiPath}`,
				path: renderPathTemplate(
					operation.apiPath,
					operation.presetPathParams,
				),
			},
		];
	}

	const [parameter] = expandablePathParameters;
	const values = parameter.schema?.enum ?? [];

	return values.map((value) => {
		const paramValue = String(value);
		const presetPathParams = {
			...operation.presetPathParams,
			[parameter.name as string]: paramValue,
		};

		return {
			...operation,
			key: `${operation.method}:${operation.apiPath}:${parameter.name}=${paramValue}`,
			path: renderPathTemplate(operation.apiPath, presetPathParams),
			presetPathParams,
		};
	});
}

function buildSwaggerOperations(
	spec: SwaggerSpec,
	serverNodeEnv: string,
): SwaggerOperation[] {
	const operations: SwaggerOperation[] = [];

	for (const [fullPath, pathItem] of Object.entries(spec.paths || {})) {
		const sharedParameters = Array.isArray(pathItem.parameters)
			? pathItem.parameters
			: [];

		for (const method of SUPPORTED_HTTP_METHODS) {
			const definition =
				pathItem[method.toLowerCase() as Lowercase<HttpMethod>];
			if (!definition) {
				continue;
			}

			const tags = Array.isArray(definition.tags)
				? definition.tags.filter(
						(tag): tag is string =>
							typeof tag === "string" && tag.length > 0,
					)
				: [];
			const apiPath = normalizeApiPath(fullPath);
			const parameters = mergeParameters(
				sharedParameters,
				Array.isArray(definition.parameters)
					? definition.parameters
					: [],
			);
			const security = Array.isArray(definition.security)
				? definition.security
				: [];
			const requestContentType = getPreferredRequestContentType(
				definition.requestBody,
			);
			const resourceNames = getOperationResourceNames(apiPath);

			operations.push(
				...expandOperationVariants({
					category: tags[0] || "Uncategorized",
					label:
						getOperationSummary(definition) ||
						renderPathTemplate(apiPath),
					method,
					apiPath,
					summary: getOperationSummary(definition),
					parameters,
					security,
					requestBody: definition.requestBody,
					requestContentType,
					autoRunBlocker: getAutoRunBlocker(
						{
							apiPath,
							method,
							security,
							parameters,
							requestContentType,
						},
						serverNodeEnv,
					),
					presetPathParams: {},
					resourceNames,
				}),
			);
		}
	}

	return operations.sort((left, right) => {
		if (left.apiPath === "/user/me") {
			return -1;
		}
		if (right.apiPath === "/user/me") {
			return 1;
		}

		const leftIsMutation = left.method !== "GET";
		const rightIsMutation = right.method !== "GET";
		if (leftIsMutation !== rightIsMutation) {
			return leftIsMutation ? 1 : -1;
		}

		const paramCompare =
			countPathParams(left.path) - countPathParams(right.path);
		if (paramCompare !== 0) {
			return paramCompare;
		}

		if (left.path.length !== right.path.length) {
			return left.path.length - right.path.length;
		}

		const pathCompare = left.path.localeCompare(right.path);
		if (pathCompare !== 0) {
			return pathCompare;
		}

		const categoryCompare = left.category.localeCompare(right.category);
		if (categoryCompare !== 0) {
			return categoryCompare;
		}

		return compareMethods(left.method, right.method);
	});
}

function seedValuePoolFromSwagger(spec: SwaggerSpec, valuePool: ValuePool) {
	for (const [schemaName, schema] of Object.entries(
		spec.components?.schemas || {},
	)) {
		const schemaExample = buildValueFromSchema(schema, spec, {
			explicitOnly: true,
			propertyName: schemaName,
			resourceNames: [schemaName],
			valuePool,
		});
		if (schemaExample !== undefined) {
			harvestValuePool(valuePool, schemaExample, {
				resourceNames: [schemaName],
				propertyName: schemaName,
			});
		}
	}

	for (const [fullPath, pathItem] of Object.entries(spec.paths || {})) {
		const apiPath = normalizeApiPath(fullPath);
		const sharedParameters = Array.isArray(pathItem.parameters)
			? pathItem.parameters
			: [];

		const seedParameter = (parameter: SwaggerParameter) => {
			if (!parameter.name) {
				return;
			}

			const resourceNames = getParameterResourceNames(
				apiPath,
				parameter.name,
			);
			const parameterSeed = getParameterSeedValue(parameter);
			if (parameterSeed !== undefined) {
				addValueToPool(
					valuePool,
					parameter.name,
					parameterSeed,
					resourceNames,
				);
			}

			const schemaSeed = buildValueFromSchema(parameter.schema, spec, {
				explicitOnly: true,
				propertyName: parameter.name,
				resourceNames,
				valuePool,
			});
			if (schemaSeed !== undefined) {
				harvestValuePool(valuePool, schemaSeed, {
					resourceNames,
					propertyName: parameter.name,
				});
			}
		};

		sharedParameters.forEach(seedParameter);

		for (const method of SUPPORTED_HTTP_METHODS) {
			const definition =
				pathItem[method.toLowerCase() as Lowercase<HttpMethod>];
			if (!definition) {
				continue;
			}

			const resourceNames = getOperationResourceNames(apiPath);
			const operationParameters = Array.isArray(definition.parameters)
				? definition.parameters
				: [];
			operationParameters.forEach(seedParameter);

			for (const mediaType of Object.values(
				definition.requestBody?.content || {},
			)) {
				const requestSeed = getMediaTypeExample(mediaType, spec, {
					explicitOnly: true,
					resourceNames,
					valuePool,
				});
				if (requestSeed !== undefined) {
					harvestValuePool(valuePool, requestSeed, { resourceNames });
				}
			}

			for (const response of Object.values(definition.responses || {})) {
				for (const mediaType of Object.values(response.content || {})) {
					const responseSeed = getMediaTypeExample(mediaType, spec, {
						explicitOnly: true,
						resourceNames,
						valuePool,
					});
					if (responseSeed !== undefined) {
						harvestValuePool(valuePool, responseSeed, {
							resourceNames,
						});
					}
				}
			}
		}
	}
}

async function loadSwaggerOperations(): Promise<SwaggerLoadResult> {
	const response = await fetch(`${formbarUrl}/docs/openapi.json`);
	if (!response.ok) {
		throw new Error(
			`Swagger docs request failed with status ${response.status}.`,
		);
	}

	const spec = (await response.json()) as SwaggerSpec;
	const serverNodeEnv = getServerNodeEnv(spec);
	return {
		spec,
		serverNodeEnv,
		operations: buildSwaggerOperations(spec, serverNodeEnv),
	};
}

async function callApi(
	path: string,
	method: HttpMethod,
	options: {
		headers?: Record<string, string>;
		body?: PreparedRequestBody;
	} = {},
): Promise<ApiResponse> {
	const headers: Record<string, string> = {
		...options.headers,
	};

	if (accessToken && !headers.Authorization) {
		headers.Authorization = `Bearer ${accessToken}`;
	}

	let body: BodyInit | undefined;
	if (options.body) {
		const { contentType, value } = options.body;
		if (contentType === "application/json") {
			headers["Content-Type"] = contentType;
			body = JSON.stringify(value);
		} else if (contentType === "application/x-www-form-urlencoded") {
			headers["Content-Type"] = contentType;
			const params = new URLSearchParams();
			if (isRecord(value)) {
				for (const [key, entry] of Object.entries(value)) {
					if (entry == null) {
						continue;
					}

					if (Array.isArray(entry)) {
						for (const item of entry) {
							if (item == null) {
								continue;
							}
							params.append(
								key,
								typeof item === "string"
									? item
									: JSON.stringify(item),
							);
						}
						continue;
					}

					params.set(
						key,
						typeof entry === "string"
							? entry
							: JSON.stringify(entry),
					);
				}
			}
			body = params.toString();
		} else if (contentType === "text/plain") {
			headers["Content-Type"] = contentType;
			body = typeof value === "string" ? value : JSON.stringify(value);
		}
	}

	const response = await fetch(`${formbarUrl}/api/v1${path}`, {
		method,
		headers,
		body,
	});
	const rawText = await response.text();
	let responseBody: unknown = rawText;
	if (rawText) {
		try {
			responseBody = JSON.parse(rawText);
		} catch {
			responseBody = rawText;
		}
	}

	const bodySuccess =
		isRecord(responseBody) && typeof responseBody.success === "boolean"
			? responseBody.success
			: undefined;
	const hasStructuredError =
		isRecord(responseBody) &&
		("error" in responseBody ||
			("success" in responseBody && responseBody.success === false));

	return {
		ok: response.ok && bodySuccess !== false && !hasStructuredError,
		status: response.status,
		body: responseBody,
		rawText,
	};
}

async function loadContext(valuePool: ValuePool): Promise<{
	context: TestingContext;
	meResult: ApiResponse;
}> {
	const meResult = await callApi("/user/me", "GET");
	const me = getResponseData<CurrentLoginData>(meResult.body);
	if (!meResult.ok || !me?.id) {
		throw new Error(
			summarizePayload(meResult.body) || "Failed to load /user/me.",
		);
	}

	harvestValuePool(valuePool, me, {
		resourceNames: ["user", "me"],
		propertyName: "user",
	});

	addValueToPool(valuePool, "id", me.id, ["user"]);
	addValueToPool(valuePool, "email", me.email, ["user"]);

	const activeClassValue =
		me.activeClass != null
			? String(me.activeClass)
			: me.classId != null
				? String(me.classId)
				: null;
	if (activeClassValue) {
		addValueToPool(valuePool, "id", activeClassValue, ["class", "room"]);
		addValueToPool(valuePool, "classId", activeClassValue, [
			"class",
			"room",
		]);
		addValueToPool(valuePool, "activeClass", activeClassValue, [
			"class",
			"room",
		]);
	}

	return {
		meResult,
		context: {
			me,
			valuePool,
		},
	};
}

function resolveParameterValue(
	operation: SwaggerOperation,
	parameter: SwaggerParameter,
	spec: SwaggerSpec,
	context: TestingContext,
) {
	const parameterName = parameter.name;
	if (!parameterName) {
		return null;
	}

	const presetValue = operation.presetPathParams[parameterName];
	if (presetValue) {
		return presetValue;
	}

	const seededValue = stringifyParameterValue(
		getParameterSeedValue(parameter),
	);
	if (seededValue) {
		return seededValue;
	}

	const resourceNames = getParameterResourceNames(
		operation.apiPath,
		parameterName,
	);
	const pooledValue = findValueInPool(
		context.valuePool,
		[parameterName],
		resourceNames,
	);
	if (pooledValue) {
		return pooledValue;
	}

	const synthesizedValue = buildValueFromSchema(parameter.schema, spec, {
		parameterMode: true,
		propertyName: parameterName,
		resourceNames,
		valuePool: context.valuePool,
		currentUser: context.me,
	});

	return stringifyParameterValue(synthesizedValue);
}

function buildRequestBody(
	operation: SwaggerOperation,
	spec: SwaggerSpec,
	context: TestingContext,
):
	| { status: "omit" }
	| { status: "ready"; body: PreparedRequestBody }
	| { status: "error"; reason: string } {
	if (!operation.requestBody?.content) {
		return { status: "omit" };
	}

	if (!operation.requestContentType) {
		return {
			status: "error",
			reason: "Swagger request body metadata did not expose a usable content type.",
		};
	}

	const mediaType =
		operation.requestBody.content[operation.requestContentType];
	if (!mediaType) {
		return {
			status: "error",
			reason: `Swagger request body content is missing for "${operation.requestContentType}".`,
		};
	}

	const requestValue = getMediaTypeExample(mediaType, spec, {
		propertyName: singularizeWord(operation.category),
		resourceNames: operation.resourceNames,
		valuePool: context.valuePool,
		currentUser: context.me,
	});

	const requestSchema = mediaType.schema;
	const normalizedRequestValue =
		operation.requestContentType === "application/json" &&
		!isJsonRootValueCompatible(requestValue, requestSchema, spec)
			? buildValueFromSchema(requestSchema, spec, {
					propertyName: singularizeWord(operation.category),
					resourceNames: operation.resourceNames,
					valuePool: context.valuePool,
					currentUser: context.me,
				})
			: requestValue;

	if (normalizedRequestValue === undefined) {
		return operation.requestBody.required
			? {
					status: "error",
					reason: "Unable to synthesize a request body from the Swagger schema.",
				}
			: { status: "omit" };
	}

	if (
		operation.requestContentType === "application/json" &&
		!isJsonRootValueCompatible(normalizedRequestValue, requestSchema, spec)
	) {
		return {
			status: "error",
			reason: "Swagger request body example does not match the JSON schema root type.",
		};
	}

	harvestValuePool(context.valuePool, normalizedRequestValue, {
		resourceNames: operation.resourceNames,
	});

	return {
		status: "ready",
		body: {
			contentType: operation.requestContentType,
			value: normalizedRequestValue,
		},
	};
}

function prepareRequest(
	operation: SwaggerOperation,
	spec: SwaggerSpec,
	context: TestingContext,
): RequestPreparationResult {
	const pathParameters = operation.parameters.filter(
		(parameter) => parameter.in === "path",
	);
	const queryParameters = operation.parameters.filter(
		(parameter) => parameter.in === "query",
	);
	const headerParameters = operation.parameters.filter(
		(parameter) => parameter.in === "header",
	);

	const resolvedPathParams = { ...operation.presetPathParams };
	for (const parameter of pathParameters) {
		const parameterValue = resolveParameterValue(
			operation,
			parameter,
			spec,
			context,
		);
		if (!parameterValue || !parameter.name) {
			return {
				ok: false,
				reason: `No automatic value is available for path parameter "${parameter.name}".`,
			};
		}

		resolvedPathParams[parameter.name] = parameterValue;
	}

	let path = operation.apiPath.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const value = resolvedPathParams[name];
		return value ? encodeURIComponent(value) : `{${name}}`;
	});

	const query = new URLSearchParams();
	for (const parameter of queryParameters) {
		const parameterValue = resolveParameterValue(
			operation,
			parameter,
			spec,
			context,
		);
		if (!parameterValue) {
			if (parameter.required) {
				return {
					ok: false,
					reason: `No automatic value is available for required query parameter "${parameter.name}".`,
				};
			}
			continue;
		}

		if (parameter.name) {
			query.set(parameter.name, parameterValue);
		}
	}

	const headers: Record<string, string> = {};
	for (const parameter of headerParameters) {
		const parameterValue = resolveParameterValue(
			operation,
			parameter,
			spec,
			context,
		);
		if (!parameterValue) {
			if (parameter.required) {
				return {
					ok: false,
					reason: `No automatic value is available for required header parameter "${parameter.name}".`,
				};
			}
			continue;
		}

		if (parameter.name) {
			headers[parameter.name] = parameterValue;
		}
	}

	const requestBody = buildRequestBody(operation, spec, context);
	if (requestBody.status === "error") {
		return {
			ok: false,
			reason: requestBody.reason,
		};
	}

	const queryString = query.toString();
	if (queryString) {
		path = `${path}?${queryString}`;
	}

	return {
		ok: true,
		path,
		headers,
		body: requestBody.status === "ready" ? requestBody.body : undefined,
	};
}

function hasAutoRunBlocker(
	operation: SwaggerOperation,
): operation is SwaggerOperation & { autoRunBlocker: string } {
	return (
		typeof operation.autoRunBlocker === "string" &&
		operation.autoRunBlocker.length > 0
	);
}

export function Testing() {
	const { settings } = useSettings();
	const { userData } = useUserData();
	const autoRunKeyRef = useRef<string | null>(null);
	const runSuiteRef = useRef<() => Promise<void>>(async () => {});
	const [results, setResults] = useState<TestResult[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [fatalError, setFatalError] = useState<string | null>(null);
	const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
	const [swaggerOperations, setSwaggerOperations] = useState<
		SwaggerOperation[]
	>([]);
	const [swaggerError, setSwaggerError] = useState<string | null>(null);
	const [serverNodeEnv, setServerNodeEnv] = useState<string>("production");

	const updateResult = (
		key: string,
		updater: (result: TestResult) => TestResult,
	) => {
		setResults((current) =>
			current.map((result) =>
				result.key === key ? updater(result) : result,
			),
		);
	};

	runSuiteRef.current = async () => {
		if (!accessToken) {
			setFatalError(
				"No access token is available yet. Open this page after the current login finishes bootstrapping.",
			);
			return;
		}

		setIsRunning(true);
		setFatalError(null);
		setRunStartedAt(new Date().toLocaleTimeString());
		setSwaggerError(null);
		setResults([]);

		try {
			const valuePool = createValuePool();
			const { spec, operations, serverNodeEnv } =
				await loadSwaggerOperations();
			seedValuePoolFromSwagger(spec, valuePool);
			setServerNodeEnv(serverNodeEnv);
			setSwaggerOperations(operations);

			const runnableOperations = operations.filter(
				(operation) => !operation.autoRunBlocker,
			);

			setResults(
				runnableOperations.map((operation) => ({
					key: operation.key,
					category: operation.category,
					label: operation.label,
					method: operation.method,
					path: operation.path,
					status: "pending",
					details: "",
				})),
			);

			if (runnableOperations.length === 0) {
				setFatalError(
					"Swagger docs loaded, but no endpoints were eligible for automatic testing.",
				);
				return;
			}

			const meOperation = runnableOperations.find(
				(operation) => operation.apiPath === "/user/me",
			);

			if (meOperation) {
				updateResult(meOperation.key, (result) => ({
					...result,
					status: "running",
				}));
			}

			const meStartedAt = performance.now();
			const { context, meResult } = await loadContext(valuePool);
			harvestValuePool(valuePool, meResult.body, {
				resourceNames: ["user", "me"],
			});

			if (meOperation) {
				updateResult(meOperation.key, (result) => ({
					...result,
					status: meResult.ok ? "passed" : "failed",
					statusCode: meResult.status,
					durationMs: Math.round(performance.now() - meStartedAt),
					details: summarizePayload(meResult.body),
				}));
			}

			for (const operation of runnableOperations) {
				if (operation.apiPath === "/user/me") {
					continue;
				}

				const preparedRequest = prepareRequest(
					operation,
					spec,
					context,
				);
				if (!preparedRequest.ok) {
					updateResult(operation.key, (result) => ({
						...result,
						status: "skipped",
						details: preparedRequest.reason,
					}));
					continue;
				}

				updateResult(operation.key, (result) => ({
					...result,
					path: preparedRequest.path,
					status: "running",
					details: "",
				}));

				const requestStartedAt = performance.now();
				try {
					const response = await callApi(
						preparedRequest.path,
						operation.method,
						{
							headers: preparedRequest.headers,
							body: preparedRequest.body,
						},
					);
					if (response.ok) {
						harvestValuePool(valuePool, response.body, {
							resourceNames: operation.resourceNames,
						});
					}
					updateResult(operation.key, (result) => ({
						...result,
						status: response.ok ? "passed" : "failed",
						statusCode: response.status,
						durationMs: Math.round(
							performance.now() - requestStartedAt,
						),
						details: summarizePayload(response.body),
					}));
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Request failed.";
					updateResult(operation.key, (result) => ({
						...result,
						status: "failed",
						durationMs: Math.round(
							performance.now() - requestStartedAt,
						),
						details: message,
					}));
				}
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unable to build the automatic Swagger test suite.";
			setSwaggerError(message);
			setFatalError(message);
		} finally {
			setIsRunning(false);
		}
	};

	const handleRunSuite = () => {
		void runSuiteRef.current();
	};

	useEffect(() => {
		if (!userData?.id) {
			return;
		}

		const nextKey = String(userData.id);
		if (autoRunKeyRef.current === nextKey) {
			return;
		}

		autoRunKeyRef.current = nextKey;
		void runSuiteRef.current();
	}, [userData?.id]);

	const passedCount = results.filter(
		(result) => result.status === "passed",
	).length;
	const failedCount = results.filter(
		(result) => result.status === "failed",
	).length;
	const skippedCount = results.filter(
		(result) => result.status === "skipped",
	).length;
	const unsupportedEndpoints = swaggerOperations
		.filter(hasAutoRunBlocker)
		.map<StaticIssue>((operation) => ({
			key: operation.key,
			category: operation.category,
			method: operation.method,
			path: operation.path,
			reason: operation.autoRunBlocker,
		}));
	const autoRunnableCount =
		swaggerOperations.length - unsupportedEndpoints.length;
	const mutationAutoRunEnabled = serverNodeEnv === "development";

	return (
		<div
			style={{
				padding: "0 20px",
				height: "calc(100vh - 60px)",
				overflowY: "auto",
				overflowX: "hidden",
			}}
		>
			<FormbarHeader />
			<Flex
				vertical
				gap={16}
				style={{
					padding: "16px 0 32px",
				}}
			>
				<Card
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 0),
					}}
				>
					<Flex justify="space-between" align="center" wrap gap={16}>
						<div>
							<Typography.Title level={2} style={{ margin: 0 }}>
								Endpoint Testing
							</Typography.Title>
							<Typography.Paragraph style={{ margin: "8px 0 0" }}>
								This page builds its suite directly from the
								backend Swagger JSON, seeds request values from
								documented examples plus live responses, and
								auto-runs non-DELETE mutating endpoints when the
								server reports `NODE_ENV=development`.
							</Typography.Paragraph>
							<Typography.Text type="secondary">
								Last run: {runStartedAt || "Not run yet"} |
								Server env: {serverNodeEnv}
							</Typography.Text>
						</div>
						<Button
							type="primary"
							onClick={handleRunSuite}
							loading={isRunning}
						>
							Run Suite Again
						</Button>
					</Flex>
				</Card>

				<Space
					wrap
					size={[12, 12]}
					style={getAppearAnimation(settings.disableAnimations, 1)}
				>
					<Tag color="green">Passed: {passedCount}</Tag>
					<Tag color="red">Failed: {failedCount}</Tag>
					<Tag color="orange">Skipped: {skippedCount}</Tag>
					<Tag color="blue">
						Not auto-run: {unsupportedEndpoints.length}
					</Tag>
					<Tag color="geekblue">
						Swagger endpoints: {swaggerOperations.length}
					</Tag>
					<Tag color="cyan">Auto-runnable: {autoRunnableCount}</Tag>
					<Tag color={mutationAutoRunEnabled ? "green" : "volcano"}>
						Non-DELETE mutations:{" "}
						{mutationAutoRunEnabled ? "Enabled" : "Disabled"}
					</Tag>
				</Space>

				{fatalError ? (
					<Alert
						type="error"
						showIcon
						message="Suite bootstrap failed"
						description={fatalError}
						style={getAppearAnimation(
							settings.disableAnimations,
							2,
						)}
					/>
				) : null}

				<Alert
					type="info"
					showIcon
					message="Auto-run scope"
					description={`The suite is generated from /docs/openapi.json at runtime. Parameters, bodies, and candidate values are sourced from Swagger metadata first, then enriched with live response data as the run progresses. DELETE endpoints are always excluded. Non-DELETE mutating endpoints are ${
						mutationAutoRunEnabled
							? "included because the backend reports NODE_ENV=development."
							: "excluded because the backend does not report NODE_ENV=development."
					}`}
					style={getAppearAnimation(settings.disableAnimations, 3)}
				/>

				{swaggerError ? (
					<Alert
						type="warning"
						showIcon
						message="Swagger docs unavailable"
						description={swaggerError}
						style={getAppearAnimation(
							settings.disableAnimations,
							4,
						)}
					/>
				) : null}

				<Card
					title="Auto-Run Results"
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 5),
					}}
				>
					<Table<TestResult>
						rowKey="key"
						size="small"
						pagination={false}
						dataSource={results}
						columns={[
							{
								title: "Category",
								dataIndex: "category",
								key: "category",
								width: 160,
							},
							{
								title: "Method",
								dataIndex: "method",
								key: "method",
								width: 90,
								render: (value: HttpMethod) => (
									<Tag>{value}</Tag>
								),
							},
							{
								title: "Endpoint",
								key: "endpoint",
								render: (_, record) => (
									<div>
										<div>{record.label}</div>
										<Typography.Text type="secondary">
											{record.path}
										</Typography.Text>
									</div>
								),
							},
							{
								title: "Status",
								dataIndex: "status",
								key: "status",
								width: 110,
								render: (value: TestStatus) =>
									getStatusTag(value),
							},
							{
								title: "Details",
								dataIndex: "details",
								key: "details",
							},
							{
								title: "Time",
								key: "durationMs",
								width: 90,
								render: (_, record) =>
									record.durationMs != null
										? `${record.durationMs} ms`
										: "--",
							},
						]}
					/>
				</Card>

				<Card
					title="Not Auto-Run"
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 6),
					}}
				>
					<Table<StaticIssue>
						rowKey="key"
						size="small"
						pagination={{ pageSize: 12 }}
						dataSource={unsupportedEndpoints}
						columns={[
							{
								title: "Category",
								dataIndex: "category",
								key: "category",
								width: 160,
							},
							{
								title: "Method",
								dataIndex: "method",
								key: "method",
								width: 90,
								render: (value: HttpMethod) => (
									<Tag>{value}</Tag>
								),
							},
							{
								title: "Endpoint",
								dataIndex: "path",
								key: "path",
							},
							{
								title: "Reason",
								dataIndex: "reason",
								key: "reason",
							},
						]}
					/>
				</Card>

				<Card
					title="Swagger Endpoints"
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 7),
					}}
				>
					<Table<SwaggerOperation>
						rowKey="key"
						size="small"
						pagination={{ pageSize: 12 }}
						dataSource={swaggerOperations}
						columns={[
							{
								title: "Category",
								dataIndex: "category",
								key: "category",
								width: 160,
							},
							{
								title: "Method",
								dataIndex: "method",
								key: "method",
								width: 90,
								render: (value: HttpMethod) => (
									<Tag>{value}</Tag>
								),
							},
							{
								title: "Path",
								dataIndex: "path",
								key: "path",
							},
							{
								title: "Summary",
								dataIndex: "summary",
								key: "summary",
							},
							{
								title: "Automation",
								key: "automation",
								width: 120,
								render: (_, record) =>
									record.autoRunBlocker ? (
										<Tag color="volcano">Skipped</Tag>
									) : (
										<Tag color="green">Auto-run</Tag>
									),
							},
						]}
					/>
				</Card>
			</Flex>
		</div>
	);
}
