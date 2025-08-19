import { useEffect } from 'react';

export function useNavbarHeight(
	navId: string = 'global-navbar',
	cssVarName: string = '--nav-h',
	cssVarOffsetName: string = '--nav-offset'
) {
	useEffect(() => {
		const nav = document.getElementById(navId);
		if (!nav) return;

		const setMetrics = () => {
			const rect = nav.getBoundingClientRect();
			const height = Math.round(rect.height);
			const offsetTop = Math.max(0, Math.round(rect.top)); // e.g., Tailwind top-2
			document.documentElement.style.setProperty(cssVarName, `${height}px`);
			document.documentElement.style.setProperty(cssVarOffsetName, `${offsetTop}px`);
		};

		setMetrics();

		const ro = new ResizeObserver(setMetrics);
		ro.observe(nav);

		window.addEventListener('resize', setMetrics);
		return () => {
			window.removeEventListener('resize', setMetrics);
			ro.disconnect();
		};
	}, [navId, cssVarName, cssVarOffsetName]);
}


