export interface Env {
  [key: string]: string;
}
export interface MinimalEnv {
  HEALTH_CHECKER: string;
  VIRTUAL_PORT: string;
  HEALTH_TIMEOUT: string;
  HEALTH_MAX_RETRY: string;
}
