import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PacketsPanel from './PacketsPanel';

describe('PacketsPanel', () => {
  it('renders the true-path packet shell without exposing private packet concepts', () => {
    const html = renderToStaticMarkup(
      <PacketsPanel
        selectedPacketID={null}
        onClose={() => undefined}
        onSelectPacket={() => undefined}
        onReplayPacket={() => undefined}
      />
    );
    expect(html).toContain('True Path Packets');
    expect(html).toContain('Only packets with real public route segments');
    expect(html).toContain('Search endpoint, region, route prefix, message');
    expect(html).not.toContain('hash');
    expect(html).not.toContain('raw');
    expect(html).not.toContain('resolver');
  });
});
