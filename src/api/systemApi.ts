import { http } from "@api/HTTPApi";

// GET: Get the server's public key (for pinging server)
export function getPublicKey() {
    return http("/certs");
}

// GET: Get the current server config
export function getServerConfig() {
    return http("/config");
}