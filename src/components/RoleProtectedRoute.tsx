import { useRBAC } from "@/hooks/useRBAC";
import AccessDenied from "@/components/AccessDenied";

type Role = "super_admin" | "admin" | "sales" | "operations" | "finance";

interface Props {
  children: React.ReactNode;
  allowedRoles: Role[];
  pageName?: string;
}

const RoleProtectedRoute = ({ children, allowedRoles, pageName }: Props) => {
  const { role } = useRBAC();
  if (!allowedRoles.includes(role as Role)) {
    return <AccessDenied pageName={pageName} />;
  }
  return <>{children}</>;
};

export default RoleProtectedRoute;
