import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { CONFIG } from "@/constants/config";

const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("check", CONFIG.BASE_URL);


api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;