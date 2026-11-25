const required = [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_KEY",
];

for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configure ${name} no ambiente do EAS antes de gerar o app.`);
  if (name.endsWith("KEY")) continue;
  const url = new URL(value);
  if (url.protocol !== "https:" || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(url.hostname)) {
    throw new Error(`${name} precisa usar uma URL HTTPS pública.`);
  }
}
console.log("Ambiente do APK configurado com URLs públicas.");
