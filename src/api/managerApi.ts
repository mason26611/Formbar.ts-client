import { http } from "./HTTPApi";

export function getManagerData(offset?: number, limit?: number, sortBy?: string) {
    return http(`/manager?offset=${offset}&limit=${limit}&sortBy=${sortBy}`);
}

export function deleteIpFromList(whitelist: boolean, ipId: number) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}/${ipId}`, "DELETE");
}

export function getIpAccessList(whitelist: boolean) {
    return http(`/ip/${whitelist ? 'whitelist' : 'blacklist'}`);
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