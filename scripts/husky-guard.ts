import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GuardConfig {
  enabled: boolean;
  blockOnFailures: boolean;
  checks: string[];
  failFast: boolean;
  reportPath: string;
}

const DEFAULT_CONFIG: GuardConfig = {
  enabled: true,
  blockOnFailures: true,
  checks: ['lint', 'typecheck', 'test', 'security'],
  failFast: true,
  reportPath: '.husky/_guard-report.json',
};

interface GuardResult {
  passed: boolean;
  check: string;
  duration: number;
  errors: string[];
  warnings: string[];
}

export class HuskyPreCommitGuard {
  private config: GuardConfig;
  private results: GuardResult[] = [];

  constructor(config?: Partial<GuardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async runGuard(): Promise<GuardResult[]> {
    const results: GuardResult[] = [];

    for (const check of this.config.checks) {
      const result = await this.runCheck(check);
      results.push(result);

      if (!result.passed && this.config.failFast) {
        break;
      }
    }

    this.results = results;
    this.generateReport();

    return results;
  }

  private async runCheck(check: string): Promise<GuardResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let command: string;
      switch (check) {
        case 'lint':
          command = 'npx eslint --max-warnings 0';
          break;
        case 'typecheck':
          command = 'npx tsc --noEmit';
          break;
        case 'test':
          command = 'npx jest --passWithNoTests';
          break;
        case 'security':
          command = 'npx audit-ci --moderate';
          break;
        default:
          command = `npx ${check}`;
      }

      execSync(command, { stdio: 'pipe', timeout: 60000 });

      return {
        passed: true,
        check,
        duration: Date.now() - startTime,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        check,
        duration: Date.now() - startTime,
        errors: [errorMessage],
        warnings: [],
      };
    }
  }

  private generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      passed: this.results.every((r) => r.passed),
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.passed).length,
        failed: this.results.filter((r) => !r.passed).length,
      },
    };

    const reportDir = path.dirname(this.config.reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(this.config.reportPath, JSON.stringify(report, null, 2));
  }

  async preCommit(): Promise<boolean> {
    if (!this.config.enabled) return true;

    const results = await this.runGuard();
    const allPassed = results.every((r) => r.passed);

    if (!allPassed && this.config.blockOnFailures) {
      console.error('Pre-commit guard failed. Commit blocked.');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.error(`  ❌ ${r.check}: ${r.errors.join(', ')}`);
        });
    }

    return allPassed;
  }

  getResults(): GuardResult[] {
    return [...this.results];
  }

  getConfig(): GuardConfig {
    return { ...this.config };
  }
}
