import { loadEnv } from "./config/env";
import { buildApp } from "./server";

export async function createApp() {
  return buildApp(loadEnv());
}