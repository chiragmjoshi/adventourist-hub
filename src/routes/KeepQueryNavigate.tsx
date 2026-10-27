import { Navigate, useLocation, type NavigateProps } from "react-router-dom";

/**
 * <Navigate> that carries the current query string (utm_*, oppref, gclid…)
 * onto the redirect target so ad attribution survives legacy redirects.
 * If the target already has its own query, the current params are merged in.
 */
export default function KeepQueryNavigate({ to, ...rest }: NavigateProps & { to: string }) {
  const { search } = useLocation();
  return <Navigate to={withQuery(to, search)} {...rest} />;
}

export function withQuery(to: string, search: string): string {
  if (!search || search === "?") return to;
  const hashIdx = to.indexOf("#");
  const hash = hashIdx >= 0 ? to.slice(hashIdx) : "";
  const base = hashIdx >= 0 ? to.slice(0, hashIdx) : to;
  const [path, existing = ""] = base.split("?");
  const params = new URLSearchParams(existing);
  new URLSearchParams(search).forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash}`;
}
