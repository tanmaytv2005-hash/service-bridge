import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });
export const errorText = (err) => {
  const d = err.response?.data;
  if (d?.details?.length) return d.details.map((x) => `${x.field}: ${x.message}`).join(' | ');
  return d?.message || 'Cannot reach the server. Is the API running?';
};
