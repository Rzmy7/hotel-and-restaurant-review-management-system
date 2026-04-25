/**
 * API Service for System Monitoring
 */

import { Server, Database, Search, Globe } from 'lucide-react';
import type { ServerStatus } from '../types';
import { apiClient } from '../api/client';
import { getApiBaseUrl } from '../config/api';

const DEFAULT_MAIN_BACKEND_URL = getApiBaseUrl();
const DEFAULT_SCRAPING_URL = import.meta.env.VITE_SCRAPING_URL || 'http://localhost:8001';
const DEFAULT_EMBEDDING_URL = import.meta.env.VITE_EMBEDDING_SERVICE_URL || 'http://localhost:8002';
const DEFAULT_FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

/**
 * Get server URLs from localStorage or environment variables
 */
const getServerUrls = () => {
    return {
        mainBackend: localStorage.getItem('mainBackendUrl') || DEFAULT_MAIN_BACKEND_URL,
        scraping: localStorage.getItem('scrapingBackendUrl') || DEFAULT_SCRAPING_URL,
        embedding: localStorage.getItem('embeddingServiceUrl') || DEFAULT_EMBEDDING_URL,
        frontend: DEFAULT_FRONTEND_URL
    };
};

/**
 * Fetch health status from a server
 */
const fetchServerHealth = async (url: string, healthPath: string = '/health', timeout: number = 3000): Promise<{
    status: 'Online' | 'Offline' | 'Warning';
    cpuUsage: number;
    ramUsage: number;
    uptime: string;
}> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${url}${healthPath}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const rawStatus = String(data.status || 'online').toLowerCase();
        const normalizedStatus: 'Online' | 'Offline' | 'Warning' =
            rawStatus === 'healthy' || rawStatus === 'ok' || rawStatus === 'online'
                ? 'Online'
                : rawStatus === 'warning' || rawStatus === 'degraded'
                    ? 'Warning'
                    : 'Offline';
        
        return {
            status: normalizedStatus,
            cpuUsage: data.cpu_usage || data.cpuUsage || data.cpu || 0,
            ramUsage: data.ram_usage || data.ramUsage || data.memory_usage || data.memoryUsage || data.ram || 0,
            uptime: data.uptime || '0d 0h 0m'
        };
    } catch (error) {
        clearTimeout(timeoutId);
        
        // If aborted due to timeout or network error, server is offline
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
            return {
                status: 'Offline',
                cpuUsage: 0,
                ramUsage: 0,
                uptime: 'N/A'
            };
        }
        
        throw error;
    }
};

/**
 * Fetch status for all servers
 */
export const fetchServerStatuses = async (): Promise<ServerStatus[]> => {
    const urls = getServerUrls();
    
    const servers: Array<{
        id: string;
        name: string;
        url: string;
        healthPath: string;
        icon: any;
    }> = [
        // Main Backend card reads admin-backend server stats endpoint (same server context).
        { id: '1', name: 'Main Backend', url: urls.mainBackend, healthPath: '/admin/monitoring/main-backend-status', icon: Server },
        { id: '2', name: 'Scraping Service', url: urls.scraping, healthPath: '/api/system/admin-health', icon: Search },
        { id: '3', name: 'Embedding Service', url: urls.embedding, healthPath: '/health', icon: Database },
        { id: '4', name: 'Frontend Server', url: urls.frontend, healthPath: '/health', icon: Globe }
    ];

    // Fetch all server statuses in parallel
    const results = await Promise.allSettled(
        servers.map(async (server) => {
            try {
                let health;
                if (server.id === '1') {
                    // Use apiClient for main backend with a timeout to avoid hanging when offline
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    try {
                        const data = await apiClient.get<any>(server.healthPath, undefined, undefined, controller.signal);
                        clearTimeout(timeoutId);
                        const rawStatus = String(data.status || 'online').toLowerCase();
                        const normalizedStatus: 'Online' | 'Offline' | 'Warning' =
                            rawStatus === 'healthy' || rawStatus === 'ok' || rawStatus === 'online'
                                ? 'Online'
                                : rawStatus === 'warning' || rawStatus === 'degraded'
                                    ? 'Warning'
                                    : 'Offline';
                        health = {
                            status: normalizedStatus,
                            cpuUsage: data.cpu_usage || data.cpuUsage || data.cpu || 0,
                            ramUsage: data.ram_usage || data.ramUsage || data.memory_usage || data.memoryUsage || data.ram || 0,
                            uptime: data.uptime || '0d 0h 0m'
                        };
                    } catch {
                        clearTimeout(timeoutId);
                        health = { status: 'Offline' as const, cpuUsage: 0, ramUsage: 0, uptime: 'N/A' };
                    }
                } else {
                    health = await fetchServerHealth(server.url, server.healthPath);
                }
                return {
                    id: server.id,
                    name: server.name,
                    status: health.status,
                    cpuUsage: health.cpuUsage,
                    ramUsage: health.ramUsage,
                    icon: server.icon,
                    uptime: health.uptime
                };
            } catch (error) {
                console.error(`Failed to fetch health for ${server.name}:`, error);
                return {
                    id: server.id,
                    name: server.name,
                    status: 'Offline' as const,
                    cpuUsage: 0,
                    ramUsage: 0,
                    icon: server.icon,
                    uptime: 'N/A'
                };
            }
        })
    );

    // Extract successful results
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            // Fallback for rejected promises
            return {
                id: servers[index].id,
                name: servers[index].name,
                status: 'Offline' as const,
                cpuUsage: 0,
                ramUsage: 0,
                icon: servers[index].icon,
                uptime: 'N/A'
            };
        }
    });
};

/**
 * Fetch status for a specific server
 */
export const fetchSingleServerStatus = async (serverName: 'mainBackend' | 'scraping' | 'embedding' | 'frontend'): Promise<ServerStatus | null> => {
    const urls = getServerUrls();
    const urlMap = {
        mainBackend: { url: urls.mainBackend, healthPath: '/admin/monitoring/main-backend-status', name: 'Main Backend', icon: Server, id: '1' },
        scraping: { url: urls.scraping, healthPath: '/api/system/admin-health', name: 'Scraping Service', icon: Search, id: '2' },
        embedding: { url: urls.embedding, healthPath: '/health', name: 'Embedding Service', icon: Database, id: '3' },
        frontend: { url: urls.frontend, healthPath: '/health', name: 'Frontend Server', icon: Globe, id: '4' }
    };

    const server = urlMap[serverName];
    
    try {
        let health;
        if (server.id === '1') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            try {
                const data = await apiClient.get<any>(server.healthPath, undefined, undefined, controller.signal);
                clearTimeout(timeoutId);
                const rawStatus = String(data.status || 'online').toLowerCase();
                const normalizedStatus: 'Online' | 'Offline' | 'Warning' =
                    rawStatus === 'healthy' || rawStatus === 'ok' || rawStatus === 'online'
                        ? 'Online'
                        : rawStatus === 'warning' || rawStatus === 'degraded'
                            ? 'Warning'
                            : 'Offline';
                health = {
                    status: normalizedStatus,
                    cpuUsage: data.cpu_usage || data.cpuUsage || data.cpu || 0,
                    ramUsage: data.ram_usage || data.ramUsage || data.memory_usage || data.memoryUsage || data.ram || 0,
                    uptime: data.uptime || '0d 0h 0m'
                };
            } catch {
                clearTimeout(timeoutId);
                health = { status: 'Offline' as const, cpuUsage: 0, ramUsage: 0, uptime: 'N/A' };
            }
        } else {
            health = await fetchServerHealth(server.url, server.healthPath);
        }
        return {
            id: server.id,
            name: server.name,
            status: health.status,
            cpuUsage: health.cpuUsage,
            ramUsage: health.ramUsage,
            icon: server.icon,
            uptime: health.uptime
        };
    } catch (error) {
        console.error(`Failed to fetch health for ${server.name}:`, error);
        return {
            id: server.id,
            name: server.name,
            status: 'Offline',
            cpuUsage: 0,
            ramUsage: 0,
            icon: server.icon,
            uptime: 'N/A'
        };
    }
};
