import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps a page's active sub-tab in sync with the `?tab=` URL query param.
 * This lets the Sidebar deep-link directly into a specific sub-tab
 * (e.g. /environmental?tab=Emission%20Factors) while still behaving like
 * normal local state for the SubTabs component.
 *
 * @param {string[]} validTabs - list of valid tab labels for this page
 * @param {string} defaultTab - tab to fall back to when the param is missing/invalid
 * @returns {[string, (tab: string) => void]}
 */
export default function useTabParam(validTabs, defaultTab) {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramTab = searchParams.get('tab');
  const tab = validTabs.includes(paramTab) ? paramTab : defaultTab;

  const setTab = useCallback(
    (next) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('tab', next);
        return params;
      });
    },
    [setSearchParams]
  );

  return [tab, setTab];
}
