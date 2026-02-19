import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { legacyMenu } from './menuConfig';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../shared/api/http';
import type { MenuGroup } from '../../shared/types/menu';
import './main-layout.css';

type IconName =
  | 'layers'
  | 'bar'
  | 'wallet'
  | 'gear'
  | 'bank'
  | 'report'
  | 'search'
  | 'mail'
  | 'shield'
  | 'setup'
  | 'debenture'
  | 'building'
  | 'users'
  | 'briefcase'
  | 'file'
  | 'link'
  | 'pencil'
  | 'grid'
  | 'refresh'
  | 'help'
  | 'bell'
  | 'bot'
  | 'profile'
  | 'printer'
  | 'signature';

type BreadcrumbItem = {
  label: string;
  path?: string;
};

type ShortcutItem = {
  label: string;
  icon: IconName;
  route: string;
  variant?: 'default' | 'danger' | 'muted';
  dividerBefore?: boolean;
  badge?: string;
};

const iconPathByName: Record<IconName, string> = {
  layers: 'M12 3l8 4.5-8 4.5-8-4.5L12 3zm-8 9l8 4.5 8-4.5M4 16.5L12 21l8-4.5',
  bar: 'M5 19V9m7 10V5m7 14v-7',
  wallet: 'M4 8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm12 4h4',
  gear: 'M12 8.5A3.5 3.5 0 1012 15.5 3.5 3.5 0 0012 8.5zm8 3.5l-1.8.6a6.6 6.6 0 01-.6 1.4l.9 1.7-1.8 1.8-1.7-.9a6.6 6.6 0 01-1.4.6L12 20l-2.6-2.8a6.6 6.6 0 01-1.4-.6l-1.7.9-1.8-1.8.9-1.7a6.6 6.6 0 01-.6-1.4L4 12l1.8-.6a6.6 6.6 0 01.6-1.4l-.9-1.7 1.8-1.8 1.7.9a6.6 6.6 0 011.4-.6L12 4l2.6 2.8a6.6 6.6 0 011.4.6l1.7-.9 1.8 1.8-.9 1.7c.3.4.5.9.6 1.4L20 12z',
  bank: 'M3 10l9-5 9 5M5 10v8m4-8v8m4-8v8m4-8v8M3 19h18',
  report: 'M7 4h7l4 4v12H7zM14 4v4h4M9 13h6M9 17h6',
  search: 'M11 4a7 7 0 015.6 11.2L20 18.6 18.6 20l-3.4-3.4A7 7 0 1111 4z',
  mail: 'M3 7l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  shield: 'M12 3l7 3v6c0 5-3.3 8.3-7 9-3.7-.7-7-4-7-9V6l7-3z',
  setup: 'M4 6h16M7 6v12m10-8H9m8 4H9',
  debenture: 'M8 4h10v14H8zM6 8H4m2 4H4m2 4H4',
  building: 'M5 20V6h14v14M9 10h2m2 0h2m-6 4h2m2 0h2',
  users: 'M8.5 12a3 3 0 110-6 3 3 0 010 6zm7 2a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 20a5 5 0 0110 0m1.5 0a4 4 0 018 0',
  briefcase: 'M9 6V4h6v2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h4z',
  file: 'M8 4h7l4 4v12H8zM15 4v4h4',
  link: 'M8.5 15.5l-2 2a3 3 0 01-4.2-4.2l2-2M15.5 8.5l2-2a3 3 0 014.2 4.2l-2 2M9 15l6-6',
  pencil: 'M4 20h4l10-10-4-4L4 16v4zM13 7l4 4M16 4l4 4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  refresh: 'M20 6v5h-5M4 18v-5h5M6.5 9A7 7 0 0119 10M17.5 15A7 7 0 015 14',
  help: 'M12 18h.01M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4M12 22a10 10 0 110-20 10 10 0 010 20z',
  bell: 'M12 22a2.5 2.5 0 002.5-2.5h-5A2.5 2.5 0 0012 22zm7-5H5l1.5-2.5V10a5.5 5.5 0 1111 0v4.5L19 17z',
  bot: 'M9 4h6M12 4V2M7 9h10a3 3 0 013 3v4a3 3 0 01-3 3H7a3 3 0 01-3-3v-4a3 3 0 013-3zm3 5v.01M15 14v.01',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  printer: 'M7 8V4h10v4M6 12h12a2 2 0 012 2v4H4v-4a2 2 0 012-2zm2 4h8v4H8v-4zM17 12h.01',
  signature: 'M3 16c2.2 0 2.4-3 4.6-3 1.7 0 2 2 3.5 2 1.2 0 1.7-1 2.8-1 1.4 0 2.3 2 4.1 2M5 9l3-3 2.2 2.2L7.2 11M14 7h7',
};

const resolveLeafIcon = (label: string, route: string): IconName => {
  if (label === 'Administradoras') return 'building';
  if (label === 'Agentes' || label === 'Usuários' || label === 'Representantes') return 'users';
  if (label === 'Bancos') return 'bank';
  if (route.startsWith('/admin')) return 'shield';
  if (route.startsWith('/cadastro')) return 'briefcase';
  if (route.startsWith('/construcao')) return 'file';
  return 'link';
};

const chunkItems = <T,>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0 || items.length === 0) return [items];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

const MenuIcon = ({ name }: { name: IconName }) => (
  <svg className="menu-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={iconPathByName[name]} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const contextShortcuts: ShortcutItem[] = [
  { label: 'Painel', icon: 'grid', route: '/construcao/atalhos/painel' },
  { label: 'Matriz', icon: 'bar', route: '/construcao/atalhos/matriz' },
  { label: 'Configurações', icon: 'gear', route: '/construcao/atalhos/configuracoes' },
  { label: 'Impressão', icon: 'printer', route: '/construcao/atalhos/impressao' },
  { label: 'Assinaturas', icon: 'signature', route: '/construcao/atalhos/assinaturas' },
  { label: 'Usuário', icon: 'profile', route: '/admin/usuarios' },
  { label: 'Atualizar', icon: 'refresh', route: '/construcao/atalhos/atualizar', dividerBefore: true },
  { label: 'Ajuda', icon: 'help', route: '/construcao/atalhos/ajuda' },
  { label: 'Alertas', icon: 'bell', route: '/construcao/atalhos/alertas', variant: 'danger', badge: '28' },
  { label: 'Assistente', icon: 'bot', route: '/construcao/atalhos/assistente', variant: 'muted' },
];

const isImplementedRoute = (route: string) => !route.startsWith('/construcao/');

const filterImplementedMenuGroups = (groups: MenuGroup[]): MenuGroup[] =>
  groups
    .map((group) => {
      const childrens = group.childrens.filter((child) => isImplementedRoute(child.route));
      const complementaryItems = group.complementaryItems
        ?.map((comp) => ({
          ...comp,
          childrens: comp.childrens.filter((child) => isImplementedRoute(child.route)),
        }))
        .filter((comp) => comp.childrens.length > 0);

      return { ...group, childrens, complementaryItems };
    })
    .filter((group) => group.childrens.length > 0 || (group.complementaryItems?.length ?? 0) > 0);

export const MainLayout = () => {
  const { isSecuritizadora, contextEmpresas, selectedEmpresaIds, updateContextSelection } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fundPickerOpen, setFundPickerOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const [savingSelection, setSavingSelection] = useState(false);
  const [panelOffsetByGroup, setPanelOffsetByGroup] = useState<Record<string, number>>({});
  const navRef = useRef<HTMLElement | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const contextRef = useRef<HTMLDivElement | null>(null);
  const closeMenuTimerRef = useRef<number | null>(null);
  const topbarRef = useRef<HTMLElement | null>(null);
  const location = useLocation();

  const menuGroups = useMemo(
    () =>
      filterImplementedMenuGroups(legacyMenu).filter(
        (group) => group.label !== 'Securitizadora' || isSecuritizadora,
      ),
    [isSecuritizadora],
  );
  const visibleContextShortcuts = useMemo(
    () => contextShortcuts.filter((shortcut) => isImplementedRoute(shortcut.route)),
    [],
  );

  const breadcrumbIndex = useMemo(() => {
    const index = new Map<string, string[]>();

    menuGroups.forEach((group) => {
      group.childrens.forEach((child) => {
        index.set(child.route, [group.label, child.label]);
      });

      group.complementaryItems?.forEach((complementaryGroup) => {
        complementaryGroup.childrens.forEach((child) => {
          index.set(child.route, [group.label, complementaryGroup.label, child.label]);
        });
      });
    });

    return index;
  }, [menuGroups]);

  const breadcrumbs = useMemo(() => {
    const currentPath = location.pathname;
    if (currentPath === '/') {
      return [{ label: 'Início' }] as BreadcrumbItem[];
    }

    const knownTrail = breadcrumbIndex.get(currentPath);

    if (knownTrail) {
      return [{ label: 'Início', path: '/' }, ...knownTrail.map((label) => ({ label }))] as BreadcrumbItem[];
    }

    const rawSegments = currentPath.split('/').filter(Boolean);
    const fallbackSegments = rawSegments.map((segment) =>
      decodeURIComponent(segment)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    );

    return [
      { label: 'Início', path: '/' },
      ...fallbackSegments.map((label, index, all) => ({
        label,
        path: index === all.length - 1 ? undefined : `/${rawSegments.slice(0, index + 1).join('/')}`,
      })),
    ] as BreadcrumbItem[];
  }, [breadcrumbIndex, location.pathname]);

  const calculatePanelWidth = (isWideGroup: boolean, isCompactGroup: boolean) => {
    const maxWidth = Math.max(window.innerWidth - 32, 320);

    if (isWideGroup) return Math.min(1580, maxWidth);
    if (isCompactGroup) return Math.min(420, maxWidth);
    return Math.min(920, maxWidth);
  };

  const clearCloseTimer = () => {
    if (closeMenuTimerRef.current !== null) {
      window.clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
  };

  const scheduleCloseGroup = (groupLabel: string) => {
    clearCloseTimer();

    closeMenuTimerRef.current = window.setTimeout(() => {
      setOpenGroup((currentGroup) => (currentGroup === groupLabel ? null : currentGroup));
    }, 180);
  };

  const openMenuGroup = (
    label: string,
    options: { isWideGroup: boolean; isCompactGroup: boolean; isRightAlignedGroup: boolean },
  ) => {
    setOpenGroup(label);

    if (window.innerWidth <= 1024) return;

    const groupElement = groupRefs.current[label];
    if (!groupElement) return;

    const panelWidth = calculatePanelWidth(options.isWideGroup, options.isCompactGroup);
    const rect = groupElement.getBoundingClientRect();
    const desiredLeft = options.isRightAlignedGroup ? rect.width - panelWidth : 0;
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - panelWidth - 16);
    const absoluteLeft = rect.left + desiredLeft;
    const clampedAbsoluteLeft = Math.min(Math.max(absoluteLeft, minLeft), maxLeft);
    const relativeOffset = clampedAbsoluteLeft - rect.left;

    setPanelOffsetByGroup((prev) => ({ ...prev, [label]: relativeOffset }));
  };

  const onMenuLinkClick = () => {
    clearCloseTimer();
    setOpenGroup(null);
    setMobileOpen(false);
  };

  const selectedEmpresas = useMemo(
    () => contextEmpresas.filter((item) => selectedEmpresaIds.includes(item.id)),
    [contextEmpresas, selectedEmpresaIds],
  );

  const currentFundLabel = useMemo(() => {
    if (selectedEmpresas.length === 0) {
      return 'Sem empresa de contexto';
    }

    if (selectedEmpresas.length === 1) {
      return selectedEmpresas[0].nome;
    }

    return `${selectedEmpresas.length} empresas selecionadas`;
  }, [selectedEmpresas]);

  const canUseHoverMenus = () => (
    window.innerWidth > 1024 && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );

  const openContextPicker = () => {
    setPendingSelection(selectedEmpresaIds);
    setFundPickerOpen(true);
  };

  const togglePendingEmpresa = (empresaId: string) => {
    setPendingSelection((current) =>
      current.includes(empresaId)
        ? current.filter((id) => id !== empresaId)
        : [...current, empresaId],
    );
  };

  const saveContextSelection = async () => {
    if (pendingSelection.length === 0) {
      return;
    }

    setSavingSelection(true);
    try {
      await updateContextSelection(pendingSelection);
      setFundPickerOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingSelection(false);
    }
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        clearCloseTimer();
        setOpenGroup(null);
      }

      if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
        setFundPickerOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      clearCloseTimer();
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const topbarElement = topbarRef.current;
    if (!topbarElement) return;

    const setTopbarHeight = () => {
      const { height } = topbarElement.getBoundingClientRect();
      root.style.setProperty('--topbar-height', `${Math.ceil(height)}px`);
    };

    setTopbarHeight();
    const observer = new ResizeObserver(setTopbarHeight);
    observer.observe(topbarElement);
    window.addEventListener('resize', setTopbarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', setTopbarHeight);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar" ref={topbarRef}>
        <div className="brand-wrap">
          <button className="mobile-toggle" onClick={() => setMobileOpen((v) => !v)}>
            Menu
          </button>
          <Link to="/" className="brand">
            <span className="brand-mark">
              <img className="brand-logo-img" src="/black101-logo.png" alt="Black101" />
            </span>
          </Link>
        </div>

        <nav className={`mega-nav ${mobileOpen ? 'open' : ''}`} ref={navRef}>
          {menuGroups.map((group, groupIndex) => {
            const totalLinks =
              group.childrens.length +
              (group.complementaryItems?.reduce((acc, item) => acc + item.childrens.length, 0) ?? 0);
            const isWideGroup = totalLinks >= 16;
            const isRightAlignedGroup = groupIndex >= menuGroups.length - 2;
            const isCompactGroup = totalLinks <= 8;
            const primarySections = isWideGroup ? chunkItems(group.childrens, 6) : [group.childrens];
            const denseColumnCount = primarySections.length + (group.complementaryItems?.length ?? 0);

            return (
              <div
                key={group.label}
                className="mega-group"
                ref={(element) => {
                  groupRefs.current[group.label] = element;
                }}
                onMouseEnter={() => {
                  if (canUseHoverMenus()) {
                    clearCloseTimer();
                    openMenuGroup(group.label, { isWideGroup, isCompactGroup, isRightAlignedGroup });
                  }
                }}
                onMouseLeave={() => {
                  if (canUseHoverMenus()) {
                    scheduleCloseGroup(group.label);
                  }
                }}
              >
              <button
                className={`mega-trigger ${openGroup === group.label ? 'is-active' : ''}`}
                onClick={() => {
                  if (openGroup === group.label) {
                    setOpenGroup(null);
                    return;
                  }

                  openMenuGroup(group.label, { isWideGroup, isCompactGroup, isRightAlignedGroup });
                }}
                type="button"
              >
                <span className="mega-trigger-label">{group.label}</span>
              </button>

              <div
                className={[
                  'mega-panel',
                  openGroup === group.label ? 'show' : '',
                  isWideGroup ? 'is-wide' : '',
                  isCompactGroup ? 'is-compact' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  panelOffsetByGroup[group.label] !== undefined && window.innerWidth > 1024
                    ? { left: `${panelOffsetByGroup[group.label]}px`, right: 'auto' }
                    : undefined
                }
              >
                  <div className="mega-panel-inner">
                  <div
                    className={`mega-columns ${isWideGroup ? 'is-dense' : ''}`}
                    style={
                      isWideGroup
                        ? ({ ['--dense-column-count' as string]: String(Math.min(Math.max(denseColumnCount, 5), 8)) } as CSSProperties)
                        : undefined
                    }
                  >
                    {primarySections.map((sectionItems, sectionIndex) => (
                      <section key={`${group.label}-${sectionIndex}`} className="mega-column">
                        <h4 className="mega-title">
                          {sectionIndex === 0 ? group.label : `${group.label} ${sectionIndex + 1}`}
                        </h4>
                        <ul>
                          {sectionItems.map((child) => (
                            <li key={child.label}>
                              <Link to={child.route} onClick={onMenuLinkClick}>
                                <span className="mega-link-icon"><MenuIcon name={resolveLeafIcon(child.label, child.route)} /></span>
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}

                    {group.complementaryItems?.map((comp) => (
                      <section key={comp.label} className="mega-column">
                        <h4 className="mega-title">{comp.label}</h4>
                        <ul>
                          {comp.childrens.map((child) => (
                            <li key={child.label}>
                              <Link to={child.route} onClick={onMenuLinkClick}>
                                <span className="mega-link-icon"><MenuIcon name={resolveLeafIcon(child.label, child.route)} /></span>
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>

                  <aside className="mega-feature">
                    <span className="mega-feature-kicker">Acesso rapido</span>
                    <h4 className="mega-feature-title">{group.label}</h4>
                    <p className="mega-feature-text">
                      Navegue pelos itens mais usados deste modulo e acesse o restante pelo painel ao lado.
                    </p>

                    <ul className="mega-feature-list">
                      {group.childrens.slice(0, 4).map((child) => (
                        <li key={`${group.label}-${child.label}`}>
                          <Link to={child.route} className="mega-feature-link" onClick={onMenuLinkClick}>
                            <span className="mega-link-icon"><MenuIcon name={resolveLeafIcon(child.label, child.route)} /></span>
                            <span>{child.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    {group.childrens[0] ? (
                      <Link to={group.childrens[0].route} className="mega-feature-cta" onClick={onMenuLinkClick}>
                        Abrir {group.label}
                      </Link>
                    ) : null}
                  </aside>
                </div>
              </div>
              </div>
            );
          })}
        </nav>

      </header>

      <section className="context-strip" ref={contextRef}>
        <nav className="breadcrumb breadcrumb-inline" aria-label="breadcrumb">
          <ol className="breadcrumb-list">
            {breadcrumbs.map((item, index) => (
              <li key={`${item.label}-${index}`} className="breadcrumb-item">
                {item.path ? <Link to={item.path}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>

        <div className="fund-context">
          <button
            type="button"
            className="fund-chip"
            onClick={openContextPicker}
            aria-expanded={fundPickerOpen}
            aria-haspopup="listbox"
          >
            <span className="fund-chip-icon">
              <MenuIcon name="bank" />
            </span>
            <span className="fund-chip-label">{currentFundLabel}</span>
          </button>
          <button type="button" className="fund-edit-btn" onClick={openContextPicker}>
            <MenuIcon name="pencil" />
            <span>Editar</span>
          </button>

          {fundPickerOpen ? (
            <div className="fund-picker" role="dialog" aria-label="Selecionar fundo de contexto">
              <h4>Selecione as empresas de contexto</h4>
              <ul role="listbox" aria-label="Fundos disponíveis">
                {contextEmpresas.map((fund) => (
                  <li key={fund.id}>
                    <button
                      type="button"
                      className={pendingSelection.includes(fund.id) ? 'is-selected' : ''}
                      onClick={() => togglePendingEmpresa(fund.id)}
                    >
                      {fund.nome}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setFundPickerOpen(false)}>Cancelar</button>
                <button
                  type="button"
                  className="btn-main"
                  disabled={pendingSelection.length === 0 || savingSelection}
                  onClick={() => void saveContextSelection()}
                >
                  {savingSelection ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="context-shortcuts" aria-label="Atalhos rápidos">
          <div className="context-shortcuts-toolbar">
            {visibleContextShortcuts.map((shortcut) => (
              <Fragment key={shortcut.label}>
                {shortcut.dividerBefore ? <span className="shortcut-divider" aria-hidden="true" /> : null}
                <Link
                  to={shortcut.route}
                  className={`shortcut-icon-btn${shortcut.variant ? ` is-${shortcut.variant}` : ''}`}
                  title={shortcut.label}
                  aria-label={shortcut.label}
                >
                  <MenuIcon name={shortcut.icon} />
                  {shortcut.badge ? <span className="shortcut-badge">{shortcut.badge}</span> : null}
                </Link>
              </Fragment>
            ))}
          </div>

          <Link to="/admin/usuarios" className="shortcut-profile-btn">
            <span>Perfil</span>
          </Link>
        </div>
      </section>

      <main className="content-wrap">
        <Outlet />
      </main>
    </div>
  );
};
