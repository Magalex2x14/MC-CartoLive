import { ExternalLink, Github } from 'lucide-react';
import { appVersion, buildNumber } from '../buildInfo';
import { routeAssetIcons } from '../assets/routes/assets';

const GITHUB_URL = 'https://github.com/n30nex/MC-CartoLive';
const MESHCORE_CANADA_URL = 'https://meshcore.ca/';

export default function LinkBar() {
  return (
    <nav className="link-bar" aria-label="Project links">
      <a className="link-bar-brand" href={MESHCORE_CANADA_URL} target="_blank" rel="noreferrer" title="Open MeshCore Canada">
        <img src={routeAssetIcons.app} alt="" aria-hidden="true" />
        <span>MeshCore Canada</span>
      </a>
      <div className="link-bar-build" aria-label={`MC-CartoLive version ${appVersion}, build ${buildNumber}`}>
        <strong>MC-CartoLive</strong>
        <span>v{appVersion}</span>
        <span>build {buildNumber}</span>
      </div>
      <a className="link-bar-github" href={GITHUB_URL} target="_blank" rel="noreferrer" title="Open MC-CartoLive on GitHub">
        <Github size={15} />
        <span>GitHub</span>
        <ExternalLink size={12} />
      </a>
    </nav>
  );
}
