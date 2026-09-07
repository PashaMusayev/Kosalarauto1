import { useState, useEffect, useCallback } from 'react';
import { 
  signOutAdmin, 
  getAdminSessionToken, 
  checkAdminServerSession 
} from '../../services/adminAuthService';

export function useAdminAuth(isOpen: boolean, showToast: (msg: string) => void) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Central Title Lock & Auth check when Admin panel is active
  useEffect(() => {
    if (!isOpen) return;

    const ADMIN_TITLE = 'Kosalar Auto Admin panel';
    const MAIN_TITLE = 'Kosalar Auto';

    // 1. Immediately set the document title
    document.title = ADMIN_TITLE;

    // 2. MutationObserver & Interval to guarantee title stays locked
    let titleEl = document.querySelector('title');
    if (!titleEl) {
      titleEl = document.createElement('title');
      document.head.appendChild(titleEl);
    }
    titleEl.textContent = ADMIN_TITLE;

    const observer = new MutationObserver(() => {
      if (document.title !== ADMIN_TITLE) {
        document.title = ADMIN_TITLE;
      }
    });

    try {
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {}

    const intervalId = setInterval(() => {
      if (document.title !== ADMIN_TITLE) {
        document.title = ADMIN_TITLE;
      }
    }, 400);

    // Server-verified admin session check
    const token = getAdminSessionToken();
    if (token) {
      checkAdminServerSession().then((isValid) => {
        if (isValid) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          signOutAdmin().catch(() => {});
        }
      }).catch(() => {
        setIsAuthenticated(false);
      });
    } else {
      setIsAuthenticated(false);
    }

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      document.title = MAIN_TITLE;
    };
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    setIsAuthenticated(false);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('kosalar_admin_logged');
      }
    } catch (e) {}
    await signOutAdmin();
    showToast('Admin paneldən çıxış edildi.');
  }, [showToast]);

  return {
    isAuthenticated,
    setIsAuthenticated,
    handleLogout
  };
}
