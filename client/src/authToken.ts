let memToken: string | null = null;

export function setToken(t: string | null) {
  memToken = t;
  if (t) {
    localStorage.setItem("ld_token", t);
  } else {
    localStorage.removeItem("ld_token");
  }
}

export function getToken() {
  return memToken ?? localStorage.getItem("ld_token");
}

// Initialize token from localStorage on load
if (typeof window !== 'undefined') {
  memToken = localStorage.getItem("ld_token");
}