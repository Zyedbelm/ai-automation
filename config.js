// ⚠️ Configuration Supabase - Nécessaire pour appeler Edge Function
// URL + ANON KEY doivent être visibles (sécurisé et normal)
window.ENV = {
  SUPABASE_URL: "https://wlysmdboeyebprkgyaug.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseXNtZGJvZXllYnBrak1gUGF1ZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzUxODE3NTA3LCJleHAiOjIwNjczOTM1MDd9.qi6B7pGd-2l-YivnCJn57AzESiHAGH_MKnd7_DOoAf0",

  // ⚠️ Clés sensibles récupérées dynamiquement via Edge Function
  STRIPE_PUBLISHABLE_KEY: "YOUR_STRIPE_PUBLISHABLE_KEY",
  STRIPE_PRODUCTS: {
    audit: "YOUR_AUDIT_PRICE_ID",
    quickwin: "YOUR_QUICKWIN_PRICE_ID",
    transformation: "YOUR_TRANSFORMATION_PRICE_ID"
  },
  WEBHOOK_API_KEY: "YOUR_WEBHOOK_API_KEY"
};

