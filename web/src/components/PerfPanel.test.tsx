import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PerfPanel, { formatAge, frameTone, toneForState } from './PerfPanel';

describe('PerfPanel helpers', () => {
  it('classifies live confidence states for compact status chips', () => {
    expect(toneForState('fresh')).toBe('good');
    expect(toneForState('moving')).toBe('good');
    expect(toneForState('quiet')).toBe('quiet');
    expect(toneForState('stale')).toBe('warn');
    expect(toneForState('degraded')).toBe('bad');
  });

  it('formats ages and frame budgets for scan-friendly metrics', () => {
    expect(formatAge(450)).toBe('450 ms');
    expect(formatAge(4_900)).toBe('5 s');
    expect(formatAge(125_000)).toBe('2 min');
    expect(formatAge(7_200_000)).toBe('2 h');
    expect(frameTone(12)).toBe('good');
    expect(frameTone(24)).toBe('warn');
    expect(frameTone(41)).toBe('bad');
  });

  it('renders the public-safe performance lab shell', () => {
    const html = renderToStaticMarkup(<PerfPanel onClose={() => undefined} />);
    expect(html).toContain('Perf Lab');
    expect(html).toContain('Live Performance');
    expect(html).toContain('Browser counters are local-only');
    expect(html).toContain('Nothing here sends telemetry');
  });
});
