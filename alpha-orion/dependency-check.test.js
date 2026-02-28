const fs = require('fs');
const path = require('path');

describe('Production Dependency Verification', () => {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    let packageJson;

    beforeAll(() => {
        try {
            const content = fs.readFileSync(packageJsonPath, 'utf8');
            packageJson = JSON.parse(content);
        } catch (error) {
            console.error('Failed to read package.json', error);
        }
    });

    test('package.json should exist and be valid JSON', () => {
        expect(packageJson).toBeDefined();
    });

    test('should contain critical production dependencies', () => {
        const deps = packageJson.dependencies;
        const requiredDeps = [
            'axios',
            'ethers',
            'express',
            'openai',
            'pg',
            'redis',
            'ws'
        ];

        requiredDeps.forEach(dep => {
            expect(deps).toHaveProperty(dep);
        });
    });

    test('should NOT contain development tools in production dependencies', () => {
        const deps = packageJson.dependencies;
        const devTools = ['jest', 'nodemon', 'supertest', 'eslint'];

        devTools.forEach(tool => {
            expect(deps).not.toHaveProperty(tool);
        });
    });
});