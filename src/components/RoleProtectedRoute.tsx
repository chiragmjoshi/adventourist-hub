import { useRBAC, type Role } from "@/hooks/useRBAC";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";

interface Props {
  children: React.ReactNode;
  allowedRoles: Role[];
  pageName?: string;
}

const RoleProtectedRoute = ({ children, allowedRoles, pageName }: Props) => {
  const { loading, session, profileLoading } = useAuth();
  const { role } = useRBAC();

  // Phase 2.1: wait on both the session and the public.users row before
  // deciding. Otherwise the brief gap between session-ready and
  // profile-loaded would flash AccessDenied for every signed-in user on
  // every page load — and under the old `super_admin` fallback it would
  // also have given them 1-tick super_admin access.
  if (loading || (session && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <AccessDenied pageName={pageName} />;
  }
  return <>{children}</>;
};

export default RoleProtectedRoute;
