import { config } from "./config";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { keys } from "@shared/schema";

/**
 * Metrics Service pro keystore telemetrii
 */

// In-memory metriky (v produkci by bylo lepší Redis/Prometheus)
interface MetricCounters {
  key_sign_total: Map<string, number>; // {purpose}:{kid}
  key_sign_fail_total: Map<string, number>; // {reason}
  key_verify_total: Map<string, number>; // {kid}
  key_verify_fail_total: Map<string, number>; // {reason}
  jwks_served_total: number;
}

class MetricsService {
  private static instance: MetricsService;
  private counters: MetricCounters;

  private constructor() {
    this.counters = {
      key_sign_total: new Map(),
      key_sign_fail_total: new Map(),
      key_verify_total: new Map(),
      key_verify_fail_total: new Map(),
      jwks_served_total: 0
    };
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Increment counter metriky
   */
  incrementCounter(metric: keyof MetricCounters, label: string, value: number = 1): void {
    if (!config.isFeatureEnabled("ENABLE_METRICS")) {
      return;
    }

    try {
      if (metric === "jwks_served_total") {
        this.counters.jwks_served_total += value;
      } else {
        const map = this.counters[metric] as Map<string, number>;
        map.set(label, (map.get(label) || 0) + value);
      }
    } catch (error) {
      console.error("Failed to increment metric:", error);
      // Nespadni kvůli metrikové chybě
    }
  }

  /**
   * Získání všech metrik
   */
  getAllMetrics(): Record<string, any> {
    return {
      key_sign_total: Object.fromEntries(this.counters.key_sign_total),
      key_sign_fail_total: Object.fromEntries(this.counters.key_sign_fail_total),
      key_verify_total: Object.fromEntries(this.counters.key_verify_total),
      key_verify_fail_total: Object.fromEntries(this.counters.key_verify_fail_total),
      jwks_served_total: this.counters.jwks_served_total
    };
  }

  /**
   * Gauge metrika - aktivní klíče per purpose
   */
  async getActiveKeysPerPurpose(): Promise<Record<string, number>> {
    if (!config.isFeatureEnabled("ENABLE_METRICS")) {
      return {};
    }

    try {
      const result = await db
        .select({
          purpose: keys.purpose,
          count: sql<number>`count(*)`
        })
        .from(keys)
        .where(eq(keys.status, "active"))
        .groupBy(keys.purpose);

      return Object.fromEntries(result.map(r => [r.purpose, Number(r.count)]));
    } catch (error) {
      console.error("Failed to get active keys gauge:", error);
      return {};
    }
  }

  /**
   * Reset všech metrik (pro testování)
   */
  reset(): void {
    this.counters.key_sign_total.clear();
    this.counters.key_sign_fail_total.clear();
    this.counters.key_verify_total.clear();
    this.counters.key_verify_fail_total.clear();
    this.counters.jwks_served_total = 0;
  }

  /**
   * Helper funkce pro různé typy metrik
   */
  recordSignSuccess(purpose: string, kid: string): void {
    this.incrementCounter("key_sign_total", `${purpose}:${kid}`);
  }

  recordSignFailure(reason: string): void {
    this.incrementCounter("key_sign_fail_total", reason);
  }

  recordVerifySuccess(kid: string): void {
    this.incrementCounter("key_verify_total", kid);
  }

  recordVerifyFailure(reason: string): void {
    this.incrementCounter("key_verify_fail_total", reason);
  }

  recordJWKSServed(): void {
    this.incrementCounter("jwks_served_total", "", 1);
  }
}

export const metrics = MetricsService.getInstance();