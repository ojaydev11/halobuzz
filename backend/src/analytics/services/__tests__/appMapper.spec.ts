import { AppMapper, AppMappingConfig } from '../appMapper';

describe('AppMapper', () => {
  let appMapper: AppMapper;

  beforeEach(() => {
    appMapper = new AppMapper();
  });

  describe('mapToAppId', () => {
    it('should return default app ID when no context provided', () => {
      const result = appMapper.mapToAppId();
      expect(result).toBe('halobuzz');
    });

    it('should return app ID from context', () => {
      const context = { appId: 'sewago' };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('sewago');
    });

    it('should return app ID from headers', () => {
      const context = { headers: { 'x-app-id': 'solsnipepro' } };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('solsnipepro');
    });

    it('should return app ID from query parameters', () => {
      const context = { query: { appId: 'nepvest' } };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('nepvest');
    });

    it('should return app ID from subdomain', () => {
      const context = { headers: { host: 'sewago.halobuzz.com' } };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('sewago');
    });

    it('should return default app ID for unknown subdomain', () => {
      const context = { headers: { host: 'unknown.halobuzz.com' } };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('halobuzz');
    });

    it('should prioritize explicit app ID over other sources', () => {
      const context = {
        appId: 'sewago',
        headers: { 'x-app-id': 'solsnipepro' },
        query: { appId: 'nepvest' }
      };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('sewago');
    });

    it('should return default app ID for invalid app ID', () => {
      const context = { appId: 'invalid-app' };
      const result = appMapper.mapToAppId(context);
      expect(result).toBe('halobuzz');
    });
  });

  describe('ensureAppId', () => {
    it('should add app ID to document without app ID', () => {
      const document = { name: 'test' };
      const context = { appId: 'sewago' };
      const result = appMapper.ensureAppId(document, context);
      expect(result.appId).toBe('sewago');
    });

    it('should not modify document with existing app ID', () => {
      const document = { appId: 'solsnipepro', name: 'test' };
      const context = { appId: 'sewago' };
      const result = appMapper.ensureAppId(document, context);
      expect(result.appId).toBe('solsnipepro');
    });

    it('should use default app ID when no context provided', () => {
      const document = { name: 'test' };
      const result = appMapper.ensureAppId(document);
      expect(result.appId).toBe('halobuzz');
    });
  });

  describe('createAppFilter', () => {
    it('should create filter with provided app ID', () => {
      const result = appMapper.createAppFilter('sewago');
      expect(result).toEqual({ appId: 'sewago' });
    });

    it('should create filter with app ID from context', () => {
      const context = { appId: 'solsnipepro' };
      const result = appMapper.createAppFilter(undefined, context);
      expect(result).toEqual({ appId: 'solsnipepro' });
    });

    it('should create filter with default app ID when no app ID provided', () => {
      const result = appMapper.createAppFilter();
      expect(result).toEqual({ appId: 'halobuzz' });
    });
  });

  describe('getAvailableAppIds', () => {
    it('should return all available app IDs', () => {
      const result = appMapper.getAvailableAppIds();
      expect(result).toEqual(['halobuzz', 'sewago', 'solsnipepro', 'nepvest']);
    });
  });

  describe('isValidAppId', () => {
    it('should return true for valid app IDs', () => {
      expect(appMapper.isValidAppId('halobuzz')).toBe(true);
      expect(appMapper.isValidAppId('sewago')).toBe(true);
      expect(appMapper.isValidAppId('solsnipepro')).toBe(true);
      expect(appMapper.isValidAppId('nepvest')).toBe(true);
    });

    it('should return false for invalid app IDs', () => {
      expect(appMapper.isValidAppId('invalid-app')).toBe(false);
      expect(appMapper.isValidAppId('')).toBe(false);
      expect(appMapper.isValidAppId('unknown')).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        defaultAppId: 'sewago',
        appMappings: {
          'sewago': 'sewago',
          'halobuzz': 'halobuzz'
        }
      };

      appMapper.updateConfig(newConfig);

      expect(appMapper.mapToAppId()).toBe('sewago');
      expect(appMapper.getAvailableAppIds()).toEqual(['sewago', 'halobuzz']);
    });

    it('should merge with existing configuration', () => {
      const partialConfig = {
        defaultAppId: 'solsnipepro'
      };

      appMapper.updateConfig(partialConfig);

      expect(appMapper.mapToAppId()).toBe('solsnipepro');
      expect(appMapper.getAvailableAppIds()).toEqual(['halobuzz', 'sewago', 'solsnipepro', 'nepvest']);
    });
  });
});
