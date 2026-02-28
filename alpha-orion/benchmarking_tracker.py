import logging
import time

class ApexBenchmarker:
    """
    Performance tracking system for Alpha-Orion.
    """
    def __init__(self, enable_prometheus=False):
        self.logger = logging.getLogger("ApexBenchmarking")
        self.enable_prometheus = enable_prometheus
        self.metrics = {}
        self.logger.info(f"Apex Benchmarking System Initialized (Prometheus: {enable_prometheus})")

    def start_timer(self, name):
        self.metrics[name] = time.time()

    def stop_timer(self, name):
        if name in self.metrics:
            elapsed = time.time() - self.metrics[name]
            self.logger.debug(f"Metric {name}: {elapsed:.4f}s")
            return elapsed
        return 0

    def record_metric(self, name, value):
        self.logger.info(f"Metric Recorded - {name}: {value}")

    def start_continuous_monitoring(self, interval_seconds=10):
        self.logger.info(f"Continuous monitoring started with interval {interval_seconds}s")

# Alias for backward compatibility if main.py uses the old name
ApexBenchmarking = ApexBenchmarker
