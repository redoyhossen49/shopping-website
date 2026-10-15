import { useState } from "react";
import { menuContext } from "./menuContext";

const MenuProvider = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const Provider = menuContext.Provider;
  return <Provider value={{ menuOpen, setMenuOpen }}>{children}</Provider>;
};
export default MenuProvider;
