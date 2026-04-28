/**
 * Unit tests for maintenanceService event helpers.
 */

import { describe, it, expect, vi } from 'vitest';
import {
    emitMaintenanceModeUpdated,
    onMaintenanceModeUpdated,
} from '../../services/maintenanceService';


describe('emitMaintenanceModeUpdated', () => {
    it('dispatches event with true', () => {
        const handler = vi.fn();
        window.addEventListener('maintenance-mode-updated', handler);

        emitMaintenanceModeUpdated(true);

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toBe(true);

        window.removeEventListener('maintenance-mode-updated', handler);
    });

    it('dispatches event with false', () => {
        const handler = vi.fn();
        window.addEventListener('maintenance-mode-updated', handler);

        emitMaintenanceModeUpdated(false);

        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toBe(false);

        window.removeEventListener('maintenance-mode-updated', handler);
    });
});


describe('onMaintenanceModeUpdated', () => {
    it('calls handler when event is emitted', () => {
        const handler = vi.fn();
        const cleanup = onMaintenanceModeUpdated(handler);

        emitMaintenanceModeUpdated(true);

        expect(handler).toHaveBeenCalledWith(true);

        cleanup();
    });

    it('cleanup removes listener', () => {
        const handler = vi.fn();
        const cleanup = onMaintenanceModeUpdated(handler);

        cleanup();
        emitMaintenanceModeUpdated(true);

        expect(handler).not.toHaveBeenCalled();
    });

    it('coerces falsy detail to false', () => {
        const handler = vi.fn();
        const cleanup = onMaintenanceModeUpdated(handler);

        // Manually dispatch with no detail
        window.dispatchEvent(new CustomEvent('maintenance-mode-updated', { detail: undefined }));

        expect(handler).toHaveBeenCalledWith(false);

        cleanup();
    });

    it('multiple handlers work independently', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        const cleanup1 = onMaintenanceModeUpdated(handler1);
        const cleanup2 = onMaintenanceModeUpdated(handler2);

        emitMaintenanceModeUpdated(true);

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);

        cleanup1();
        emitMaintenanceModeUpdated(false);

        expect(handler1).toHaveBeenCalledTimes(1); // Not called again
        expect(handler2).toHaveBeenCalledTimes(2);

        cleanup2();
    });
});
