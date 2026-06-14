/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MQTT_HOST: string
  readonly VITE_MQTT_PORT: string
  readonly VITE_MQTT_WS_PORT: string
  readonly VITE_GATEWAY_URL: string | undefined
  readonly VITE_TOPIC_STATUS: string
  readonly VITE_TOPIC_CMD: string
  readonly VITE_TOPIC_AUTH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
