const configuredAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');

export function publicAppUrl() {
  return configuredAppUrl || window.location.origin;
}

export function publicVotingUrl() {
  return `${publicAppUrl()}/votar`;
}

export function publicRegistrationUrl() {
  return `${publicAppUrl()}/cadastro`;
}
