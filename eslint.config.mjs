import reactHooks from "eslint-plugin-react-hooks"
import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React Compiler rules (new in react-hooks v7) flag existing deliberate
      // patterns: mount-time hydration guards and effect-driven data fetching.
      // Downgraded to warnings until those patterns migrate off sync setState.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]

export default eslintConfig
