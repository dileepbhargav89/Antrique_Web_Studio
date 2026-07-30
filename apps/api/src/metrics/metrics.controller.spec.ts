import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

function createController(metricsToken?: string) {
  const metricsService = new MetricsService();
  const controller = new MetricsController(metricsService, { metricsToken } as never);
  return { controller, metricsService };
}

function createReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function createRes(): { res: Response; headerSpy: jest.Mock } {
  const headerSpy = jest.fn();
  const res = { header: headerSpy } as unknown as Response;
  return { res, headerSpy };
}

describe('MetricsController', () => {
  describe('no METRICS_TOKEN configured (dev default)', () => {
    it('serves metrics with no Authorization header at all', async () => {
      const { controller } = createController(undefined);
      const { res } = createRes();

      const body = await controller.scrape(createReq(), res);

      expect(body).toContain('process_cpu_user_seconds_total');
    });

    it('sets the Prometheus exposition-format Content-Type header', async () => {
      const { controller, metricsService } = createController(undefined);
      const { res, headerSpy } = createRes();

      await controller.scrape(createReq(), res);

      expect(headerSpy).toHaveBeenCalledWith('Content-Type', metricsService.getContentType());
    });
  });

  describe('METRICS_TOKEN configured', () => {
    it('rejects a request with no Authorization header with 401', async () => {
      const { controller } = createController('secret-token');
      const { res } = createRes();

      await expect(controller.scrape(createReq(), res)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a request with the wrong token with 401', async () => {
      const { controller } = createController('secret-token');
      const { res } = createRes();

      await expect(
        controller.scrape(createReq({ authorization: 'Bearer wrong-token' }), res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a request missing the Bearer prefix with 401', async () => {
      const { controller } = createController('secret-token');
      const { res } = createRes();

      await expect(
        controller.scrape(createReq({ authorization: 'secret-token' }), res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('serves metrics for a request with the exact matching token', async () => {
      const { controller } = createController('secret-token');
      const { res } = createRes();

      const body = await controller.scrape(
        createReq({ authorization: 'Bearer secret-token' }),
        res,
      );

      expect(body).toContain('process_cpu_user_seconds_total');
    });
  });
});
