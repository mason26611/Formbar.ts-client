import { http } from "@api/HTTPApi";

export type Pagination = {
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
};

export type PaginationParams = {
	limit?: number;
	offset?: number;
};

const MAX_PAGE_SIZE = 100;

function isPositiveInteger(value: number | undefined): value is number {
	return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: number | undefined): value is number {
	return Number.isInteger(value) && Number(value) >= 0;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === "") continue;
		searchParams.set(key, String(value));
	}

	const queryString = searchParams.toString();
	return queryString ? `?${queryString}` : "";
}

export function buildPaginationQuery({ limit, offset }: PaginationParams = {}, extraParams: Record<string, string | number | boolean | undefined> = {}) {
	return buildQueryString({
		...extraParams,
		...(isPositiveInteger(limit) ? { limit } : {}),
		...(isNonNegativeInteger(offset) ? { offset } : {}),
	});
}

export function getPaginationTotal(pagination: unknown, fallbackTotal: number) {
	if (
		pagination &&
		typeof pagination === "object" &&
		typeof (pagination as Partial<Pagination>).total === "number"
	) {
		return (pagination as Pagination).total;
	}

	return fallbackTotal;
}

export async function fetchAllPaginated<T>(
	pathBuilder: (params: Required<PaginationParams>) => string,
	itemSelector: (data: unknown) => T[],
	pageSize = MAX_PAGE_SIZE,
) {
	const items: T[] = [];
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const response = await http(pathBuilder({ limit: pageSize, offset }));
		const pageItems = itemSelector(response?.data);
		items.push(...pageItems);

		const pagination = response?.data?.pagination as Partial<Pagination> | undefined;
		hasMore = Boolean(pagination?.hasMore);
		offset = typeof pagination?.offset === "number" && typeof pagination?.limit === "number"
			? pagination.offset + pagination.limit
			: offset + pageSize;

		if (!pagination) {
			hasMore = false;
		}
	}

	return items;
}
