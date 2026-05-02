export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/create',
          '/study',
          '/ai-tutor',
          '/ai-suite',
          '/teach',
          '/my-stuff',
          '/settings',
          '/profile',
          '/onboarding',
          '/student-portal',
          '/lesson-builder',
          '/flashcards',
          '/quiz',
          '/summarize',
          '/study-guide',
          '/source-library',
          '/resource-hub',
          '/join',
          '/search',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://flashfo.org/sitemap.xml',
  }
}