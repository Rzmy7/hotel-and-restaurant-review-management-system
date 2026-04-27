/**
 * Unit tests for fileValidator.
 */

import { describe, it, expect } from 'vitest';
import { validateImage } from '../../validators/fileValidator';


describe('validateImage', () => {
    const createMockFile = (type: string, sizeBytes: number): File => {
        const buffer = new ArrayBuffer(sizeBytes);
        return new File([buffer], 'test.png', { type });
    };

    it('accepts JPEG file under 2MB', () => {
        const file = createMockFile('image/jpeg', 1024 * 1024); // 1MB
        expect(() => validateImage(file)).not.toThrow();
    });

    it('accepts PNG file under 2MB', () => {
        const file = createMockFile('image/png', 500 * 1024); // 500KB
        expect(() => validateImage(file)).not.toThrow();
    });

    it('rejects GIF files', () => {
        const file = createMockFile('image/gif', 1024);
        expect(() => validateImage(file)).toThrow('Only JPG and PNG');
    });

    it('rejects SVG files', () => {
        const file = createMockFile('image/svg+xml', 1024);
        expect(() => validateImage(file)).toThrow('Only JPG and PNG');
    });

    it('rejects WebP files', () => {
        const file = createMockFile('image/webp', 1024);
        expect(() => validateImage(file)).toThrow('Only JPG and PNG');
    });

    it('rejects PDF files', () => {
        const file = createMockFile('application/pdf', 1024);
        expect(() => validateImage(file)).toThrow('Only JPG and PNG');
    });

    it('rejects files over 2MB', () => {
        const file = createMockFile('image/png', 3 * 1024 * 1024); // 3MB
        expect(() => validateImage(file)).toThrow('less than 2MB');
    });

    it('accepts file exactly 2MB', () => {
        const file = createMockFile('image/jpeg', 2 * 1024 * 1024);
        expect(() => validateImage(file)).not.toThrow();
    });
});
