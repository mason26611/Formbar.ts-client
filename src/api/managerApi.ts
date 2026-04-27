import { http } from "@api/HTTPApi";
import { buildPaginationQuery, type Pagination } from "@api/pagination";

export function getManagerData(offset: number = 0, limit: number = 24, sortBy: string = "name", search: string = "") {
    return http(`/manager${buildPaginationQuery({ limit, offset }, { sortBy, search })}`);
}

export function deleteIpFromList(whitelist: boolean, ipId: number) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}/${ipId}`, "DELETE");
}

export function getIpAccessList(whitelist: boolean, limit: number = 20, offset: number = 0) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}${buildPaginationQuery({ limit, offset })}`);
}

export async function getAllIpAccessList(whitelist: boolean) {
    const response = await getIpAccessList(whitelist, 100, 0);
    const firstPage = response?.data;
    const ips = Array.isArray(firstPage?.ips) ? [...firstPage.ips] : [];
    let pagination = firstPage?.pagination as Pagination | undefined;

    while (pagination?.hasMore) {
        const nextOffset = pagination.offset + pagination.limit;
        const nextResponse = await getIpAccessList(whitelist, 100, nextOffset);
        const pageIps = nextResponse?.data?.ips;
        if (Array.isArray(pageIps)) {
            ips.push(...pageIps);
        }
        pagination = nextResponse?.data?.pagination;
    }

    return {
        ...response,
        data: {
            ...firstPage,
            ips,
            pagination: {
                ...firstPage?.pagination,
                hasMore: false,
            },
        },
    };
}

export function toggleIpList(whitelist: boolean) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}/toggle`, "POST");
}

export function updateIpFromList(whitelist: boolean, ipId: string, ip: string) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}/${ipId}`, "PUT", {}, { ip });
}

export function addIpToList(whitelist: boolean, ip: string) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}`, "POST", {}, { ip });
}
