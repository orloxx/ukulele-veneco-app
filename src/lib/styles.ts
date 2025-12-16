// Reusable style utilities to maintain consistency and reduce duplication

export const containerStyles = {
  // Main content container with max width and responsive padding
  main: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",

  // Full height page with background
  page: "min-h-screen bg-gray-50",

  // External link styling
  externalLink: "text-blue-600 hover:text-blue-800 underline",

  // Interactive text (buttons, links)
  interactiveText:
    "text-gray-600 hover:text-gray-900 transition-colors cursor-pointer",

  // Primary button
  button:
    "inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg",

  // Form input base
  input:
    "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none",

  // Select input
  select:
    "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none",
} as const;
