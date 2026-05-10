import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Compatibility shim for stale dev-server dynamic imports.
 *
 * Some active browser sessions may still request this module after route removal.
 * Redirect users to home to avoid runtime import failures while preserving migration.
 */
export default function LaunchDeskCompat() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/home", { replace: true });
  }, [navigate]);

  return null;
}
