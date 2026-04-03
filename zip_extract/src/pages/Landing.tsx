import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Landing page now redirects to /home which contains the full SaaS landing
const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/home", { replace: true });
  }, [navigate]);

  return null;
};

export default Landing;
