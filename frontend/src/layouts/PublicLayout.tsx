import { Link, Outlet, useLocation } from 'react-router-dom';
import { HalloweenDecor } from '../components/HalloweenDecor';
import { PublicHeader } from '../components/halloween/PublicHeader';
import { useEventSettings } from '../services/useEventSettings';

export function PublicLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const event = useEventSettings({ refreshIntervalMs: isHome ? 30000 : 0 });

  return (
    <div className={`public-shell ${isHome ? 'is-home' : 'is-interior'}`}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <HalloweenDecor home={isHome} />
      <PublicHeader event={event} />
      <main id="main-content" className={isHome ? 'home-main' : 'public-main'} tabIndex={-1}>
        <Outlet context={event} />
      </main>
      <footer className="public-footer">
        <Link to="/" className="footer-brand">Halloween</Link>
        <span>Uma noite. Muitas identidades.</span>
        <Link to="/admin">Área da organização <span aria-hidden="true">↗</span></Link>
      </footer>
    </div>
  );
}
