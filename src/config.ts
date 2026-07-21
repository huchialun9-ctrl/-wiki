// 本地開發用 localhost:3000，Render 部署時前後端同源用空字串
export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '');
