import { Menu, Shield, VenetianMask, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { EventSettingsState } from '../../services/useEventSettings';
import { EventStatus } from './EventStatus';

export function PublicHeader({ event }: { event: EventSettingsState }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const location = useLocation();
  const settings = event.settings;
  const canVote = settings?.votingState === 'OPEN' || settings?.votingState === 'TEST';
  const links = [
    { to: '/', label: 'O evento' },
    { to: '/participantes', label: 'Participantes' },
    ...(canVote ? [{ to: '/votar', label: 'Votar agora' }] : []),
    ...(settings?.showPublicResults && ['RESULT_PUBLISHED', 'CLOSED'].includes(settings.votingState)
      ? [{ to: '/resultado', label: 'Resultado' }] : []),
  ];

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButton.current?.focus();
    }
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setMenuOpen(false);
    }
    const desktop = window.matchMedia('(min-width: 900px)');
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <header className="public-header" ref={header}>
      <div className="public-header-inner">
        <Link to="/" className="event-brand">
          <span className="event-brand-mark"><VenetianMask aria-hidden="true" /></span>
          <span className="event-brand-type">Halloween<span>Concurso de fantasias</span></span>
        </Link>
        <nav className="desktop-navigation" aria-label="Navegação principal">
          {links.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        </nav>
        <div className="header-tools">
          <div className="header-status"><EventStatus {...event} /></div>
          <Link to="/admin" className="header-admin" aria-label="Área administrativa"><Shield aria-hidden="true" /></Link>
          <button className="menu-toggle" ref={menuButton} type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((current) => !current)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navegação móvel" hidden={!menuOpen}>
        {links.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
        <EventStatus {...event} />
      </nav>
    </header>
  );
}
