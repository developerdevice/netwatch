/**
 * Bootstrap síncrono de tema no HTML inicial (antes da hidratação).
 * Deve refletir `ThemeProvider` em `components/providers.tsx`:
 * attribute class, storageKey "theme", themes light/dark, defaultTheme dark, enableSystem false.
 */
export const THEME_BLOCKING_SCRIPT = `!function(){try{var d=document.documentElement,t=["light","dark"];d.classList.remove.apply(d.classList,t);var e=localStorage.getItem("theme"),n="light"===e||"dark"===e?e:"dark";d.classList.add(n),d.style.colorScheme=n}catch(r){document.documentElement.classList.remove("light","dark"),document.documentElement.classList.add("dark"),document.documentElement.style.colorScheme="dark"}}();`
