import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('exposes default Node process metrics (e.g. process_cpu_user_seconds_total)', async () => {
    const metrics = new MetricsService();

    const text = await metrics.getMetrics();

    expect(text).toContain('process_cpu_user_seconds_total');
  });

  it('getContentType() returns the Prometheus exposition-format content type', () => {
    const metrics = new MetricsService();

    expect(metrics.getContentType()).toMatch(/^text\/plain/);
  });

  describe('recordHttpRequest()', () => {
    it('increments http_requests_total with the given labels', async () => {
      const metrics = new MetricsService();

      metrics.recordHttpRequest('GET', '/api/v1/widgets/:id', 200, 12.5);

      const text = await metrics.getMetrics();
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/v1/widgets/:id",status_code="200"} 1',
      );
    });

    it('accumulates across multiple calls with the same labels', async () => {
      const metrics = new MetricsService();

      metrics.recordHttpRequest('GET', '/api/v1/widgets', 200, 5);
      metrics.recordHttpRequest('GET', '/api/v1/widgets', 200, 8);

      const text = await metrics.getMetrics();
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/v1/widgets",status_code="200"} 2',
      );
    });

    it('keeps distinct label combinations as separate series', async () => {
      const metrics = new MetricsService();

      metrics.recordHttpRequest('GET', '/api/v1/widgets', 200, 5);
      metrics.recordHttpRequest('POST', '/api/v1/widgets', 201, 5);

      const text = await metrics.getMetrics();
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/v1/widgets",status_code="200"} 1',
      );
      expect(text).toContain(
        'http_requests_total{method="POST",route="/api/v1/widgets",status_code="201"} 1',
      );
    });

    it('records duration in seconds, not milliseconds', async () => {
      const metrics = new MetricsService();

      metrics.recordHttpRequest('GET', '/api/v1/widgets', 200, 250);

      const text = await metrics.getMetrics();
      // 250ms = 0.25s falls into the 0.25 bucket — confirms the
      // millisecond-to-second conversion actually happened, not just
      // that some histogram observation occurred. prom-client sorts
      // label names alphabetically in its output ("le" sorts before
      // "method"), hence the order here.
      expect(text).toMatch(
        /http_request_duration_seconds_bucket\{le="0\.25",method="GET",route="\/api\/v1\/widgets",status_code="200"\} 1/,
      );
    });
  });

  describe('recordDbQuery()', () => {
    it('observes db_query_duration_seconds, converting milliseconds to seconds', async () => {
      const metrics = new MetricsService();

      metrics.recordDbQuery(50);

      const text = await metrics.getMetrics();
      expect(text).toMatch(/db_query_duration_seconds_bucket\{le="0\.05"\} 1/);
    });

    it('is unlabeled — a single aggregate series across all queries', async () => {
      const metrics = new MetricsService();

      metrics.recordDbQuery(10);
      metrics.recordDbQuery(20);

      const text = await metrics.getMetrics();
      expect(text).toContain('db_query_duration_seconds_count 2');
    });
  });

  describe('setDeadLetterQueueSize()', () => {
    it('sets the gauge to the given value', async () => {
      const metrics = new MetricsService();

      metrics.setDeadLetterQueueSize(3);

      const text = await metrics.getMetrics();
      expect(text).toContain('jobs_dead_letter_queue_size 3');
    });

    it('overwrites the previous value, not accumulates', async () => {
      const metrics = new MetricsService();

      metrics.setDeadLetterQueueSize(5);
      metrics.setDeadLetterQueueSize(2);

      const text = await metrics.getMetrics();
      expect(text).toContain('jobs_dead_letter_queue_size 2');
    });
  });

  // Phase 10, Module 7 (Background Jobs).
  describe('recordJobExecution()', () => {
    it('increments jobs_executions_total with the given job name and status', async () => {
      const metrics = new MetricsService();

      metrics.recordJobExecution('send-email', 'succeeded');

      const text = await metrics.getMetrics();
      expect(text).toContain('jobs_executions_total{job_name="send-email",status="succeeded"} 1');
    });

    it('keeps succeeded and dead_letter as separate series for the same job', async () => {
      const metrics = new MetricsService();

      metrics.recordJobExecution('send-email', 'succeeded');
      metrics.recordJobExecution('send-email', 'succeeded');
      metrics.recordJobExecution('send-email', 'dead_letter');

      const text = await metrics.getMetrics();
      expect(text).toContain('jobs_executions_total{job_name="send-email",status="succeeded"} 2');
      expect(text).toContain('jobs_executions_total{job_name="send-email",status="dead_letter"} 1');
    });
  });

  // Phase 10, Module 9 (DB Reliability).
  describe('recordDbTransactionRetry()', () => {
    it('increments db_transaction_retries_total with the given outcome', async () => {
      const metrics = new MetricsService();

      metrics.recordDbTransactionRetry('retried');

      const text = await metrics.getMetrics();
      expect(text).toContain('db_transaction_retries_total{outcome="retried"} 1');
    });

    it('keeps each outcome as a separate series', async () => {
      const metrics = new MetricsService();

      metrics.recordDbTransactionRetry('retried');
      metrics.recordDbTransactionRetry('succeeded_after_retry');
      metrics.recordDbTransactionRetry('exhausted');
      metrics.recordDbTransactionRetry('timed_out');

      const text = await metrics.getMetrics();
      expect(text).toContain('db_transaction_retries_total{outcome="retried"} 1');
      expect(text).toContain('db_transaction_retries_total{outcome="succeeded_after_retry"} 1');
      expect(text).toContain('db_transaction_retries_total{outcome="exhausted"} 1');
      expect(text).toContain('db_transaction_retries_total{outcome="timed_out"} 1');
    });
  });

  it('two independent instances never share state (local Registry, not the prom-client default)', async () => {
    const first = new MetricsService();
    const second = new MetricsService();

    first.recordHttpRequest('GET', '/api/v1/widgets', 200, 5);

    const secondText = await second.getMetrics();
    expect(secondText).not.toContain('route="/api/v1/widgets"');
  });
});
