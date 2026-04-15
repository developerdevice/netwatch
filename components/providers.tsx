'use client'

import { ThemeProvider } from 'next-themes'

/**
 * O bootstrap de tema antes da hidratação está em `app/layout.tsx` (script no documento).
 * O ThemeProvider do next-themes foi patchado (`patches/next-themes+0.4.6.patch`) para não
 * renderizar `<script>` na árvore do React — o React 19 emite erro nesse caso.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}
