/**
 * 类型定义单元测试
 */

import { RenewalError, ErrorType, RenewalResult, BatchRenewalResult } from '../../src/types';

describe('RenewalError', () => {
  it('should create error with type and message', () => {
    const error = new RenewalError(ErrorType.CONFIG_ERROR, 'Configuration is invalid');

    expect(error).toBeInstanceOf(Error);
    expect(error.type).toBe(ErrorType.CONFIG_ERROR);
    expect(error.message).toBe('Configuration is invalid');
    expect(error.name).toBe('RenewalError');
  });

  it('should create error with type, message and code', () => {
    const error = new RenewalError(
      ErrorType.NETWORK_ERROR,
      'Network timeout',
      'TIMEOUT_001'
    );

    expect(error.type).toBe(ErrorType.NETWORK_ERROR);
    expect(error.message).toBe('Network timeout');
    expect(error.code).toBe('TIMEOUT_001');
  });

  it('should support error stack trace', () => {
    const error = new RenewalError(ErrorType.BROWSER_ERROR, 'Browser launch failed');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('RenewalError');
  });
});

describe('RenewalResult', () => {
  it('should represent a successful renewal', () => {
    const result: RenewalResult = {
      success: true,
      serverId: 'server-123',
      message: 'Renewal successful',
      details: {
        oldExpiryDate: '2024-01-01',
        newExpiryDate: '2024-02-01',
        renewalDuration: '30 days',
      },
    };

    expect(result.success).toBe(true);
    expect(result.serverId).toBe('server-123');
    expect(result.details?.newExpiryDate).toBe('2024-02-01');
    expect(result.error).toBeUndefined();
  });

  it('should represent a failed renewal', () => {
    const result: RenewalResult = {
      success: false,
      serverId: 'server-456',
      message: 'Renewal failed: Server not found',
      error: {
        code: ErrorType.BUSINESS_ERROR,
        message: 'Server not found',
        stack: 'Error: Server not found\n    at ...',
      },
    };

    expect(result.success).toBe(false);
    expect(result.serverId).toBe('server-456');
    expect(result.error?.code).toBe(ErrorType.BUSINESS_ERROR);
    expect(result.error?.message).toBe('Server not found');
  });
});

describe('BatchRenewalResult', () => {
  it('should represent batch renewal results', () => {
    const results: RenewalResult[] = [
      {
        success: true,
        serverId: 'server-1',
        message: 'Renewal successful',
      },
      {
        success: true,
        serverId: 'server-2',
        message: 'Renewal successful',
      },
      {
        success: false,
        serverId: 'server-3',
        message: 'Renewal failed',
        error: {
          code: ErrorType.NETWORK_ERROR,
          message: 'Network timeout',
        },
      },
    ];

    const batchResult: BatchRenewalResult = {
      totalCount: 3,
      successCount: 2,
      failureCount: 1,
      results,
      executionTime: 15000,
    };

    expect(batchResult.totalCount).toBe(3);
    expect(batchResult.successCount).toBe(2);
    expect(batchResult.failureCount).toBe(1);
    expect(batchResult.results).toHaveLength(3);
    expect(batchResult.executionTime).toBe(15000);
  });

  it('should calculate counts correctly from results', () => {
    const results: RenewalResult[] = [
      { success: true, serverId: 'server-1', message: 'Success' },
      { success: false, serverId: 'server-2', message: 'Failed' },
      { success: true, serverId: 'server-3', message: 'Success' },
      { success: false, serverId: 'server-4', message: 'Failed' },
      { success: true, serverId: 'server-5', message: 'Success' },
    ];

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    expect(successCount).toBe(3);
    expect(failureCount).toBe(2);
    expect(results.length).toBe(5);
  });
});

describe('ErrorType', () => {
  it('should have all expected error types', () => {
    expect(ErrorType.CONFIG_ERROR).toBe('CONFIG_ERROR');
    expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorType.BROWSER_ERROR).toBe('BROWSER_ERROR');
    expect(ErrorType.PARSE_ERROR).toBe('PARSE_ERROR');
    expect(ErrorType.VERIFY_ERROR).toBe('VERIFY_ERROR');
    expect(ErrorType.BUSINESS_ERROR).toBe('BUSINESS_ERROR');
  });
});
