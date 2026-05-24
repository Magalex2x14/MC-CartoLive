import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Gauge, Github } from 'lucide-react';
import { appVersion, buildNumber, buildTime, gitSha, releaseURL } from '../buildInfo';
import {
  GITHUB_REPO_API_URL,
  GITHUB_REPO_URL,
  commitURLForSha,
  formatBuildAge,
  normalizeRepoStats,
  readCachedRepoStats,
  shortBuildID,
  writeCachedRepoStats,
  type RepoStats
} from '../releaseInfo';

const MESHCORE_CANADA_URL = 'https://meshcore.ca/';
const MESHCORE_CANADA_LOGO = '/meshcore-canada-favicon.png';

interface LinkBarProps {
  perfOpen?: boolean;
}

export default function LinkBar({ perfOpen = false }: LinkBarProps) {
  const [now, setNow] = useState(() => Date.now());
  const [repoStats, setRepoStats] = useState<RepoStats | null>(() => readCachedRepoStats(browserStorage()));
  const buildAge = useMemo(() => formatBuildAge(buildTime, now), [now]);
  const buildID = shortBuildID(buildNumber, gitSha);
  const commitURL = commitURLForSha(gitSha || buildNumber);
  const buildDate = Number.isFinite(Date.parse(buildTime)) ? new Date(buildTime).toLocaleString() : 'Build time unavailable';

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const storage = browserStorage();
    const cached = readCachedRepoStats(storage);
    if (cached) {
      setRepoStats(cached);
      return undefined;
    }
    fetch(GITHUB_REPO_API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        const stats = normalizeRepoStats(payload);
        if (!stats) return;
        writeCachedRepoStats(storage, stats);
        setRepoStats(stats);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <nav className="link-bar" aria-label="Project links">
      <a className="link-bar-brand" href={MESHCORE_CANADA_URL} target="_blank" rel="noreferrer" title="Open MeshCore Canada">
        <img src={MESHCORE_CANADA_LOGO} alt="" aria-hidden="true" />
        <span>MeshCore Canada</span>
      </a>
      <div className="link-bar-build" aria-label={`MC-CartoLive version ${appVersion}, build ${buildNumber}`}>
        <strong>MC-CartoLive</strong>
        <a href={releaseURL} target="_blank" rel="noreferrer" title={`Open release v${appVersion}`}>
          v{appVersion}
        </a>
        <a href={commitURL} target="_blank" rel="noreferrer" title={`Open build commit ${gitSha || buildNumber}`}>
          build {buildID}
        </a>
        <span title={buildDate}>{buildAge}</span>
        <a className={`link-bar-perf ${perfOpen ? 'active' : ''}`} href="#/perf" title="Open performance lab">
          <Gauge size={13} />
          <span>Perf</span>
        </a>
      </div>
      <a className="link-bar-github" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" title="Open MC-CartoLive on GitHub">
        <Github size={15} />
        <span>{repoStats ? `${repoStats.stars.toLocaleString()} stars / ${repoStats.forks.toLocaleString()} forks` : 'GitHub'}</span>
        <ExternalLink size={12} />
      </a>
    </nav>
  );
}

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
